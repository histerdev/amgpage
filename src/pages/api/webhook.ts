import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

// IMPORTANTE: Asegúrate de que en Vercel MP_ACCESS_TOKEN sea el de PRODUCCIÓN (APP_USR-...) 
// si estás recibiendo pagos reales.
const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

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
        console.error("Error Telegram:", e);
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        
        // Mercado Pago puede enviar el ID en diferentes lugares según el tipo de evento
        const paymentId = body.data?.id || body.id;

        if (paymentId && (body.type === 'payment' || body.action?.includes('payment'))) {
            // Limpiamos el ID por si viene con ruido
            const cleanId = String(paymentId).trim();
            processPayment(cleanId).catch(err => console.error("Detalle Error Pago:", err));
        }

        return new Response(null, { status: 200 });
    } catch (e) {
        return new Response(null, { status: 200 }); // Siempre respondemos 200 a MP
    }
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;

            const { data: order } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (!order || order.status === 'PAGADO') return;

            await supabase
                .from('orders')
                .update({ status: 'PAGADO', payment_id: paymentId })
                .eq('id', orderId);

            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            const itemsHtml = items?.map(i => 
                `👟 <b>${i.product_name}</b>\n   ├ Talla: ${i.size}\n   ├ Calidad: ${i.quality}\n   └ Precio: $${Number(i.price).toLocaleString('es-CL')}`
            ).join('\n\n') || "⚠️ No hay detalles";

            const mensaje = `
🚨 <b>VENTA CONFIRMADA - AMG SHOES</b> 🚨
➖➖➖➖➖➖➖➖➖➖➖
💰 <b>Total:</b> $${new Intl.NumberFormat('es-CL').format(payment.transaction_amount || 0)}
🆔 <b>Orden:</b> <code>${orderId}</code>
👤 <b>Cliente:</b> ${order.customer_name}
📞 <b>Tel:</b> ${order.phone || 'N/A'}

📦 <b>PRODUCTOS:</b>
${itemsHtml}
➖➖➖➖➖➖➖➖➖➖➖`;

            await sendTelegram(mensaje);
        }
    } catch (error: any) {
        // Esto te dirá en Vercel si el error es de autenticación
        console.error("❌ Fallo crítico en MP:", error.message);
    }
}