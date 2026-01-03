import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

// Función interna para evitar errores de importación 404
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
        console.error("Error enviando Telegram:", e);
    }
}

export const POST: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (id) {
        // Ejecutamos en segundo plano para responder rápido a Mercado Pago
        processPayment(id).catch(console.error);
    }

    return new Response(null, { status: 200 });
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;

            // 1. Obtener la orden
            const { data: order } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (!order || order.status === 'PAGADO') return;

            // 2. Actualizar estado
            await supabase
                .from('orders')
                .update({ status: 'PAGADO', payment_id: paymentId })
                .eq('id', orderId);

            // 3. Obtener items con todos los detalles
            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            const itemsHtml = items?.map(i => 
                `👟 <b>${i.product_name}</b>\n   ├ Talla: ${i.size}\n   ├ Calidad: ${i.quality}\n   └ Precio: $${Number(i.price).toLocaleString('es-CL')}`
            ).join('\n\n') || "⚠️ No hay detalles de productos";

            // 4. Mensaje Profesional
            const mensaje = `
🚨 <b>VENTA CONFIRMADA - AMG SHOES</b> 🚨
➖➖➖➖➖➖➖➖➖➖➖
💰 <b>Total Pagado:</b> $${new Intl.NumberFormat('es-CL').format(payment.transaction_amount || 0)}
🆔 <b>Orden ID:</b> <code>${orderId}</code>
💳 <b>Pago ID:</b> <code>${paymentId}</code>

📦 <b>DETALLE DEL PEDIDO:</b>
${itemsHtml}

👤 <b>DATOS DEL CLIENTE:</b>
• Nombre: ${order.customer_name}
• Email: ${order.email}
• Teléfono: ${order.phone || 'No indicado'}
• Ciudad: ${order.city || 'N/A'}

✈️ <b>ESTADO DE LOGÍSTICA:</b>
• Origen: International Shipping
• Estado: 🟡 <b>Esperando preparación de QC</b>
➖➖➖➖➖➖➖➖➖➖➖
<i>AMG Web System v2.0</i>`;

            await sendTelegram(mensaje);
        }
    } catch (error) {
        console.error("❌ Error procesando el pago:", error);
    }
}