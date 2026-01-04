import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend'; // 📧 NUEVO: Importamos Resend

const mp = new MercadoPagoConfig({ accessToken: import.meta.env.MP_ACCESS_TOKEN });
const resend = new Resend(import.meta.env.RESEND_API_KEY); // Pon tu key en .env
const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const POST: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const topic = url.searchParams.get('topic') || url.searchParams.get('type');
        const queryId = url.searchParams.get('id') || url.searchParams.get('data.id');
        
        // Manejo básico del body para notificaciones JSON
        const body = await request.json().catch(() => ({}));
        const id = queryId || body?.data?.id;

        if (topic === 'payment' && id) {
            console.log(`⚡ Procesando pago: ${id}`);
            
            // Consultar estado en MercadoPago
            const payment = await new Payment(mp).get({ id });
            
            if (payment.status === 'approved') {
                const orderId = payment.external_reference;
                
                // 1. Actualizar Supabase a PAGADO
                const { data: order, error } = await supabaseAdmin
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', 
                        payment_id: id,
                        updated_at: new Date() 
                    })
                    .eq('id', orderId)
                    .select('*') // Retornamos la orden actualizada para usar sus datos
                    .single();

                if (error || !order) {
                    console.error("❌ Orden no encontrada para actualizar:", orderId);
                    return new Response(null, { status: 200 }); // Responder 200 a MP para que no reintente
                }

                // 2. Notificación Telegram (Tu código existente, optimizado)
                await sendTelegramNotification(order, payment);

                // 3. 📧 NUEVO: Enviar Email al Cliente
                await sendClientEmail(order);
            }
        }
        return new Response(null, { status: 200 });
    } catch (e: any) {
        console.error("Webhook Error:", e.message);
        return new Response(null, { status: 500 });
    }
};

// --- HELPERS ---

async function sendClientEmail(order: any) {
    if (!order.email) return;
    try {
        await resend.emails.send({
            from: 'amgsneakerscl@gmail.com', // Configura esto en Resend
            to: [order.email],
            subject: `👟 ¡Orden Confirmada! #${order.id.slice(0, 8)}`,
            html: `
                <div style="font-family: sans-serif; color: #333;">
                    <h1>¡Gracias por tu compra, ${order.customer_name}!</h1>
                    <p>Tu pago ha sido recibido correctamente. Estamos preparando tus zapatillas para el control de calidad (QC).</p>
                    <p><strong>ID de Orden:</strong> ${order.id}</p>
                    <p>Pronto recibirás las fotos de QC antes del envío.</p>
                    <br>
                    <p style="color: #888; font-size: 12px;">AMG Shoes Team</p>
                </div>
            `
        });
        console.log("✅ Email enviado al cliente.");
    } catch (error) {
        console.error("❌ Error enviando email:", error);
    }
}

async function sendTelegramNotification(order: any, payment: any) {
    const botToken = import.meta.env.TELEGRAM_TOKEN;
    const chatId = import.meta.env.CHAT_ID;
    
    if (!botToken || !chatId) return;

    const message = `
🚨 <b>NUEVA VENTA CONFIRMADA</b>
💰 <b>Monto:</b> $${Number(payment.transaction_amount).toLocaleString('es-CL')}
👤 <b>Cliente:</b> ${order.customer_name}
📧 <b>Email:</b> ${order.email}
📍 <b>Ciudad:</b> ${order.city}
🆔 <b>Orden:</b> <code>${order.id}</code>
    `;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
    });
}