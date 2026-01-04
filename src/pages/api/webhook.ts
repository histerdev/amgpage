import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

// 1. CONFIGURACIÓN DE CLIENTES
const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

// Blindamos Resend para que no rompa el código si falta la Key
const resendKey = import.meta.env.RESEND_API_KEY;
const resend = new Resend(resendKey || "re_not_found");

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const POST: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        // Captura de IDs de todas las formas posibles (URL o Body)
        const topic = url.searchParams.get('topic') || url.searchParams.get('type');
        const queryId = url.searchParams.get('id') || url.searchParams.get('data.id');
        const body = await request.json().catch(() => ({}));

        const notificationType = body.type || body.topic || topic;
        const dataId = body.data?.id || body.id || queryId;

        console.log(`📨 Webhook Recibido: Tipo=[${notificationType}] ID=[${dataId}]`);

        if (notificationType === 'payment' && dataId) {
            const cleanId = String(dataId).trim();
            
            // Evitar IDs de prueba o muy cortos
            if (cleanId === "1234567890" || cleanId.length < 5) {
                return new Response(null, { status: 200 });
            }

            // Esperar sincronización de MP
            await delay(2000);
            await processPayment(cleanId);
        }

        return new Response(null, { status: 200 });

    } catch (e: any) {
        console.error("🔥 Error crítico en Webhook:", e.message);
        return new Response(null, { status: 200 });
    }
};

async function processPayment(paymentId: string) {
    try {
        console.log(`🔍 Consultando pago ${paymentId}...`);
        const payment = await new Payment(client).get({ id: paymentId });

        if (payment.status === 'approved') {
            const orderId = payment.external_reference;
            
            if (!orderId) {
                console.error("⚠️ El pago no tiene external_reference.");
                return;
            }

            // 1. Obtener la orden principal
            const { data: order, error: dbError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (dbError || !order) {
                console.error("❌ Orden no encontrada en DB:", dbError?.message);
                return;
            }

            // 2. Obtener los items
            const { data: items, error: itemsError } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            if (itemsError) console.error("⚠️ Error cargando items:", itemsError.message);

            // 3. Actualizar estado a PAGADO
            if (order.status !== 'PAGADO') {
                await supabase.from('orders')
                    .update({ status: 'PAGADO', mp_payment_id: paymentId })
                    .eq('id', orderId);
                console.log("💾 DB Actualizada.");
            }

            // 4. Formatear lista para Telegram
            const itemsHtml = items?.map((i: any, index: number) => 
                `📦 <b>Producto ${index + 1}:</b>
👟 Modelo: ${i.product_name}
📏 Talla: ${i.size}
✨ Calidad: ${i.quality}
💵 Precio: $${Number(i.price).toLocaleString('es-CL')}`
            ).join('\n\n') || "⚠️ Sin detalle de productos";

            // 5. ENVIAR TELEGRAM
            const botToken = import.meta.env.TELEGRAM_TOKEN;
            const chatId = import.meta.env.CHAT_ID;

            if (botToken && chatId) {
                const mensaje = `🚨 <b>VENTA CONFIRMADA - AMG SHOES</b> 🚨
➖➖➖➖➖➖➖➖➖➖➖
🆔 <b>ID Orden:</b> <code>${orderId}</code>
💳 <b>ID Pago MP:</b> <code>${paymentId}</code>
💰 <b>Total Pagado:</b> $${Number(payment.transaction_amount).toLocaleString('es-CL')}

👤 <b>DATOS DEL CLIENTE:</b>
• Nombre: ${order.customer_name}
• Email: ${order.email}
• Teléfono: ${order.phone || 'No indicado'}
• Ciudad: ${order.city || 'No indicada'}

📦 <b>DETALLE DEL PEDIDO:</b>
${itemsHtml}

✈️ <b>INFORMACIÓN ADUANERA:</b>
• Declaración: Calzado Deportivo / Gift
• Origen: International Shipping
• Estado: 🟡 <b>Esperando preparación de QC</b>

➖➖➖➖➖➖➖➖➖➖➖
<i>Sistema de Control AMG Web</i>`;

                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: chatId, 
                        text: mensaje, 
                        parse_mode: 'HTML',
                        disable_web_page_preview: true 
                    })
                });
                console.log("✅ Notificación Telegram enviada.");
            }

            // 6. ENVIAR EMAIL (Solo si Resend está configurado)
            if (resendKey && order.email) {
                try {
                    await resend.emails.send({
                        from: 'amgsneakerscl@gmail.com', // Cambia por tu dominio verificado
                        to: [order.email],
                        subject: 'Confirmación de Pedido - AMG Shoes',
                        html: `<p>Hola ${order.customer_name}, tu pago ha sido recibido con éxito. ID Orden: ${orderId}</p>`
                    });
                    console.log("📧 Email enviado.");
                } catch (emailErr) {
                    console.error("❌ Falló el envío de email:", emailErr);
                }
            }

        }
    } catch (error: any) {
        console.error(`❌ Error en processPayment:`, error.message);
    }
}