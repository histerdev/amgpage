import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';
import { sendAdminNotification } from '../../lib/notifications';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const paymentId = body.data?.id || body.id;

        if (paymentId === "123456" || !paymentId) return new Response(null, { status: 200 });

        if (body.type === 'payment') {
            const payment = await new Payment(client).get({ id: paymentId });

            if (payment.status === 'approved') {
                const orderId = payment.external_reference;

                if (!orderId) return new Response(null, { status: 200 });

                // 1. ACTUALIZAR ESTADO EN SUPABASE
                const { data: orderData, error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', 
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId)
                    .select('*, order_items(*)') // Traemos los datos de la orden y sus items
                    .single();

                if (error) {
                    console.error("Error Supabase:", error.message);
                } else if (orderData) {
                    // 2. ENVIAR NOTIFICACIÓN DETALLADA A TELEGRAM
                    const item = orderData.order_items?.[0]; // Asumiendo un item principal
                    
                    const mensajeTelegram = `
✅ *¡NUEVA VENTA CONFIRMADA!*
--------------------------------
🆔 *Orden:* \`${orderId}\`
💰 *Pago ID:* \`${paymentId}\`
💵 *Total:* $${new Intl.NumberFormat('es-CL').format(orderData.total_price)} CLP

👟 *PRODUCTO:*
• ${item?.product_name || 'Desconocido'}
• Talla: ${item?.size || 'N/A'}
• Calidad: ${item?.quality || 'N/A'}

📦 *DATOS DE ENVÍO (ADUANA):*
👤 *Nombre:* ${orderData.customer_name}
🆔 *RUT:* ${orderData.rut}
📧 *Email:* ${orderData.email}
📞 *Teléfono:* ${orderData.phone}
📍 *Dirección:* ${orderData.address}
🌆 *Ciudad:* ${orderData.city}
🗺️ *Región:* ${orderData.region}

--------------------------------
⚡ *Estado:* LISTO PARA PROCESAR
                    `;

                    await sendAdminNotification(mensajeTelegram);
                    console.log(`✅ Notificación enviada para orden ${orderId}`);
                }
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Fallo crítico:", err.message);
        return new Response(null, { status: 200 });
    }
};