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
                
                // LEEMOS DE METADATA (Lo que enviamos en el paso 1)
                const meta = payment.metadata;

                // Actualizamos estado en Supabase
                const { data: orderData } = await supabase
                    .from('orders')
                    .update({ status: 'PAGADO', payment_id: paymentId.toString() })
                    .eq('id', orderId)
                    .select()
                    .single();

                // Construimos el mensaje con la info de METADATA (Garantizado)
                const mensajeTelegram = `
✅ *VENTA CONFIRMADA - AMG SHOES*
--------------------------------
🆔 *Orden:* \`${orderId}\`
💰 *Pago ID:* \`${paymentId}\`

👟 *PRODUCTO:*
• *Modelo:* ${meta.product_name || 'No capturado'}
• *Talla:* ${meta.size || 'No capturada'}
• *Calidad:* ${meta.quality || 'No capturada'}

📦 *CLIENTE (ADUANA):*
👤 *Nombre:* ${orderData?.customer_name || 'Ver en DB'}
🆔 *RUT:* ${orderData?.rut || 'Ver en DB'}
📍 *Dirección:* ${orderData?.address || 'Ver en DB'}
🌆 *Ciudad:* ${orderData?.city || 'Ver en DB'}

--------------------------------
🚀 *ESTADO:* LISTO PARA DESPACHO
                `;

                await sendAdminNotification(mensajeTelegram);
            }
        }
        return new Response(null, { status: 200 });
    } catch (err: any) {
        return new Response(null, { status: 200 });
    }
};