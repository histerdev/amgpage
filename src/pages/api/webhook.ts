import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';
import { sendAdminNotification } from '../../lib/notifications';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    // Mercado Pago espera 200 OK rápido. Procesamos en background.
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    if (topic === 'payment' && id) {
        try {
            const payment = await new Payment(client).get({ id });
            
            if (payment.status === 'approved') {
                const orderId = payment.external_reference;
                
                // 1. VERIFICAR ESTADO ACTUAL EN SUPABASE (Evitar duplicados)
                const { data: currentOrder } = await supabase
                    .from('orders')
                    .select('status, customer_name, total_price')
                    .eq('id', orderId)
                    .single();

                if (currentOrder?.status === 'PAGADO') {
                    console.log(`⚠️ Orden ${orderId} ya procesada.`);
                    return new Response(null, { status: 200 });
                }

                // 2. ACTUALIZAR SUPABASE
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', 
                        payment_id: id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                if (updateError) throw new Error("Fallo actualizando Supabase");

                // 3. RECUPERAR ITEMS PARA EL REPORTE (Desde Supabase, más seguro)
                const { data: orderItems } = await supabase
                    .from('order_items')
                    .select('*')
                    .eq('order_id', orderId);

                const itemsText = orderItems?.map(i => 
                    `👟 *${i.product_name}*\n   ├ Talla: ${i.size}\n   ├ Calidad: ${i.quality}\n   └ Precio: $${i.price}`
                ).join('\n\n') || "Detalles no disponibles";

                // 4. PREPARAR MENSAJE TELEGRAM
                const mensaje = `
🚨 *NUEVA VENTA CONFIRMADA* 🚨
➖➖➖➖➖➖➖➖➖➖➖
💰 *Monto:* $${new Intl.NumberFormat('es-CL').format(payment.transaction_amount || 0)}
💳 *ID Pago:* \`${id}\`
🆔 *ID Orden:* \`${orderId}\`

📦 *PRODUCTOS:*
${itemsText}

👤 *CLIENTE:*
Nombre: ${currentOrder?.customer_name}
Estado: ✅ PAGADO (Mercado Pago)
➖➖➖➖➖➖➖➖➖➖➖
_Panel Admin actualizado correctamente_
                `;

                await sendAdminNotification(mensaje);
            }
        } catch (error) {
            console.error("❌ Error en Webhook:", error);
            // Aún retornamos 200 para que MP no reintente infinitamente si es error lógico
        }
    }

    return new Response(null, { status: 200 });
};