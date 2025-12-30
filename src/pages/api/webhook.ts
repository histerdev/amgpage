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
                const meta = payment.metadata; // Datos del producto (talla/calidad)

                // 1. ACTUALIZAR Y EXTRAER TODO DE SUPABASE
                const { data: orderData, error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', 
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId)
                    .select() // Traemos todas las columnas actualizadas
                    .single();

                if (error) {
                    console.error("Error al obtener datos de la orden:", error.message);
                }

                // 2. CONSTRUIR EL REPORTE ADUANERO COMPLETO
                const mensajeTelegram = `
✅ *VENTA CONFIRMADA - AMG SHOES*
--------------------------------
🆔 *ID Orden:* \`${orderId}\`
💰 *ID Pago:* \`${paymentId}\`
💵 *Monto:* $${new Intl.NumberFormat('es-CL').format(orderData?.total_price || 0)} CLP

👟 *DETALLES DEL PRODUCTO:*
• *Modelo:* ${meta.product_name || 'No capturado'}
• *Talla:* ${meta.size || 'No capturada'}
• *Calidad:* ${meta.quality || 'No capturada'}

📦 *INFORMACIÓN COMPLETA PARA ADUANA / ENVÍO:*
👤 *Nombre:* ${orderData?.customer_name || 'N/A'}
🆔 *RUT:* ${orderData?.rut || 'N/A'}
📧 *Correo:* ${orderData?.email || 'N/A'}
📞 *Teléfono:* ${orderData?.phone || 'N/A'}
📍 *Dirección:* ${orderData?.address || 'N/A'}
🌆 *Comuna/Ciudad:* ${orderData?.city || 'N/A'}
🗺️ *Región:* ${orderData?.region || 'N/A'}

--------------------------------
⚡ *ESTADO:* LISTO PARA DESPACHO INTERNACIONAL
                `;

                await sendAdminNotification(mensajeTelegram);
                console.log(`✅ Notificación aduanera completa enviada para la orden: ${orderId}`);
            }
        }
        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Fallo crítico:", err.message);
        return new Response(null, { status: 200 });
    }
};