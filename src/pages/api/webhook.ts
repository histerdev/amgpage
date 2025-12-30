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

                // 1. ACTUALIZAR ESTADO DE LA ORDEN
                await supabase
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', 
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId);

                // 2. CONSULTA ESPECÍFICA PARA TRAER LOS ITEMS
                // Consultamos ambas tablas para asegurar que los datos de 'order_items' existan
                const { data: orderWithItems, error: fetchError } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            product_name,
                            size,
                            quality
                        )
                    `)
                    .eq('id', orderId)
                    .single();

                if (fetchError || !orderWithItems) {
                    console.error("Error al recuperar items:", fetchError?.message);
                }

                const item = orderWithItems?.order_items?.[0];

                // 3. CONSTRUIR MENSAJE PARA TELEGRAM CON DATOS CONFIRMADOS
                const mensajeTelegram = `
✅ *VENTA CONFIRMADA - AMG SHOES*
--------------------------------
🆔 *Orden:* \`${orderId}\`
💰 *Pago ID:* \`${paymentId}\`
💵 *Monto:* $${new Intl.NumberFormat('es-CL').format(orderWithItems?.total_price || 0)} CLP

👟 *DETALLES DEL PRODUCTO:*
• *Modelo:* ${item?.product_name || '⚠️ Error al cargar nombre'}
• *Talla:* ${item?.size || '⚠️ Error al cargar talla'}
• *Calidad:* ${item?.quality || '⚠️ Error al cargar calidad'}

📦 *INFO ADUANERA / ENVÍO:*
👤 *Nombre:* ${orderWithItems?.customer_name}
🆔 *RUT:* ${orderWithItems?.rut}
📧 *Email:* ${orderWithItems?.email}
📞 *Teléfono:* ${orderWithItems?.phone}
📍 *Dirección:* ${orderWithItems?.address}
🌆 *Ciudad:* ${orderWithItems?.city}
🗺️ *Región:* ${orderWithItems?.region}

--------------------------------
🚀 *Estado:* LISTO PARA PROCESAR
                `;

                await sendAdminNotification(mensajeTelegram);
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Fallo crítico en Webhook:", err.message);
        return new Response(null, { status: 200 });
    }
};