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

                // 1. ACTUALIZAR Y OBTENER DATOS (Incluyendo la relación order_items)
                // Usamos 'order_items(*)' para traer TALLA, CALIDAD y PRODUCTO
                const { data: orderData, error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', 
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId)
                    .select(`
                        *,
                        order_items (
                            product_name,
                            size,
                            quality
                        )
                    `)
                    .single();

                if (error) {
                    console.error("Error Supabase:", error.message);
                } else if (orderData) {
                    // Extraemos el primer item (el par de zapatillas comprado)
                    const item = orderData.order_items?.[0]; 
                    
                    // 2. CONSTRUIR MENSAJE CON INFO ADUANERA Y PRODUCTO
                    const mensajeTelegram = `
✅ *VENTA CONFIRMADA - AMG SHOES*
--------------------------------
🆔 *Orden:* \`${orderId}\`
💰 *Pago ID:* \`${paymentId}\`
💵 *Monto:* $${new Intl.NumberFormat('es-CL').format(orderData.total_price)} CLP

👟 *DETALLES DEL PRODUCTO:*
• *Modelo:* ${item?.product_name || 'No especificado'}
• *Talla:* ${item?.size || 'No especificada'}
• *Calidad:* ${item?.quality || 'No especificada'}

📦 *INFORMACIÓN ADUANERA / ENVÍO:*
👤 *Nombre:* ${orderData.customer_name}
🆔 *RUT:* ${orderData.rut}
📧 *Email:* ${orderData.email}
📞 *Teléfono:* ${orderData.phone}
📍 *Dirección:* ${orderData.address}
🌆 *Ciudad:* ${orderData.city}
🗺️ *Región:* ${orderData.region}

--------------------------------
🚀 *Estado:* LISTO PARA DESPACHO
                    `;

                    await sendAdminNotification(mensajeTelegram);
                    console.log(`✅ Notificación completa enviada: Orden ${orderId}`);
                }
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Fallo crítico:", err.message);
        return new Response(null, { status: 200 });
    }
};