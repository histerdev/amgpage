// src/pages/api/webhooks/mercadopago.ts
import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase'; // Asegúrate que la ruta sea correcta
import { sendAdminNotification } from '../../lib/notifications';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // Retornamos 200 OK rápido para que MP no siga spameando, procesamos en background
    if (topic === 'payment' && id) {
        // Ejecutar lógica asíncrona sin bloquear la respuesta
        processPayment(id).catch(err => console.error("Error procesando pago:", err));
    }

    return new Response(null, { status: 200 });
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;
            console.log(`✅ Pago aprobado para orden: ${orderId}`);

            // 1. VERIFICAR SI YA ESTÁ PAGADO (Idempotencia)
            const { data: currentOrder } = await supabase
                .from('orders')
                .select('status, customer_name, total_price, email')
                .eq('id', orderId)
                .single();

            if (currentOrder?.status === 'PAGADO') {
                console.log("⚠️ Orden ya registrada como pagada.");
                return;
            }

            // 2. ACTUALIZAR ESTADO EN SUPABASE
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: 'PAGADO',
                    payment_id: paymentId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (updateError) console.error("Error actualizando DB:", updateError);

            // 3. RECUPERAR ITEMS (Con reintento simple por si hay latencia en la inserción)
            let { data: orderItems } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            // Formato HTML seguro para Telegram
            const itemsHtml = orderItems && orderItems.length > 0
                ? orderItems.map(i => 
                    `👟 <b>${i.product_name}</b>\n   ├ Talla: ${i.size}\n   ├ Calidad: ${i.quality}\n   └ Precio: $${Number(i.price).toLocaleString('es-CL')}`
                  ).join('\n\n')
                : "⚠️ <i>No se pudieron recuperar los detalles de los items de la DB</i>";

            // 4. PREPARAR MENSAJE HTML
            const mensaje = `
🚨 <b>NUEVA VENTA CONFIRMADA</b> 🚨
➖➖➖➖➖➖➖➖➖➖➖
💰 <b>Monto Total:</b> $${new Intl.NumberFormat('es-CL').format(payment.transaction_amount || 0)}
💳 <b>ID Pago:</b> <code>${paymentId}</code>
🆔 <b>ID Orden:</b> <code>${orderId}</code>

📦 <b>PRODUCTOS:</b>
${itemsHtml}

👤 <b>CLIENTE:</b>
Nombre: ${currentOrder?.customer_name || 'No registrado'}
Email: ${currentOrder?.email || payment.payer?.email || 'N/A'}
Estado: ✅ <b>PAGADO</b>
➖➖➖➖➖➖➖➖➖➖➖
<i>Sistema AMG Shoes</i>
            `;

            await sendAdminNotification(mensaje);
        }
    } catch (error) {
        console.error("❌ Fatal Error en webhook logic:", error);
    }
}