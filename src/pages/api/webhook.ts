import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

// Configuración del cliente con tu Token de TEST o Producción
const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

/**
 * Función interna para envío de notificaciones a Telegram
 */
async function sendTelegram(htmlMessage: string) {
    const botToken = import.meta.env.TELEGRAM_TOKEN;
    const chatId = import.meta.env.CHAT_ID;
    if (!botToken || !chatId) return;

    try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: htmlMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });
    } catch (e) {
        console.error("❌ Error enviando a Telegram:", e);
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Intentar capturar ID desde los parámetros de la URL (IPN/Webhooks antiguos)
        const url = new URL(request.url);
        const idFromUrl = url.searchParams.get('data.id') || url.searchParams.get('id');

        // 2. Intentar capturar ID desde el cuerpo de la petición (Webhooks nuevos)
        const body = await request.json().catch(() => ({}));
        const idFromBody = body.data?.id || body.id;

        const paymentId = idFromUrl || idFromBody;

        // Validamos que sea un evento de pago y que el ID no sea del simulador (ej: 123456)
        if (paymentId && (body.type === 'payment' || body.action?.includes('payment'))) {
            const cleanId = String(paymentId).trim();

            // Filtro de seguridad: El simulador de MP envía IDs que siempre dan 404
            if (cleanId === "1234567890" || cleanId.length < 5) {
                console.log("⚠️ Ignorando notificación de prueba del simulador (ID no real)");
                return new Response(null, { status: 200 });
            }

            // Procesar el pago en segundo plano
            processPayment(cleanId).catch(err => console.error("❌ Error en processPayment:", err));
        }

        // Siempre respondemos 200 a Mercado Pago para evitar reintentos infinitos
        return new Response(null, { status: 200 });
    } catch (e) {
        console.error("❌ Error procesando el webhook:", e);
        return new Response(null, { status: 200 });
    }
};

async function processPayment(paymentId: string) {
    try {
        // Aquí es donde ocurría el 404 si el ID no existe en el entorno del Token actual
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;

            // 1. Obtener la orden de Supabase
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderErr || !order || order.status === 'PAGADO') return;

            // 2. Marcar como pagada
            await supabase
                .from('orders')
                .update({ status: 'PAGADO', payment_id: paymentId })
                .eq('id', orderId);

            // 3. Obtener los productos del pedido
            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            const itemsHtml = items?.map(i => 
                `👟 <b>${i.product_name}</b>\n   ├ Talla: ${i.size}\n   ├ Calidad: ${i.quality}\n   └ Precio: $${Number(i.price).toLocaleString('es-CL')}`
            ).join('\n\n') || "⚠️ Sin detalle de productos";

            // 4. Notificar por Telegram
            const mensaje = `
🚨 <b>VENTA CONFIRMADA - AMG SHOES</b> 🚨
➖➖➖➖➖➖➖➖➖➖➖
💰 <b>Total Pagado:</b> $${new Intl.NumberFormat('es-CL').format(payment.transaction_amount || 0)}
🆔 <b>Orden ID:</b> <code>${orderId}</code>
💳 <b>Pago ID:</b> <code>${paymentId}</code>

📦 <b>DETALLE DEL PEDIDO:</b>
${itemsHtml}

👤 <b>CLIENTE:</b>
• Nombre: ${order.customer_name}
• Email: ${order.email}
• Teléfono: ${order.phone || 'No indicado'}
• Ciudad: ${order.city || 'N/A'}

✈️ <b>LOGÍSTICA:</b>
• Estado: 🟡 <b>QC Pending</b>
➖➖➖➖➖➖➖➖➖➖➖`;

            await sendTelegram(mensaje);
            console.log(`✅ Pedido ${orderId} procesado con éxito.`);
        }
    } catch (error: any) {
        // Si sale "Payment not found", revisa que no estés mezclando TEST con PRODUCCIÓN
        console.error("❌ Error de Mercado Pago:", error.message);
    }
}