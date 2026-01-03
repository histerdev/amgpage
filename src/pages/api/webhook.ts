// src/pages/api/webhook.ts
import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        // Capturar ID de pago
        const paymentId = body.data?.id || body.id;

        // Filtro: Solo procesar si hay un ID y el tipo es pago
        if (paymentId && (body.type === 'payment' || body.action?.includes('payment'))) {
            const cleanId = String(paymentId).trim();

            // Evitar IDs del simulador de Mercado Pago
            if (cleanId === "1234567890" || cleanId.length < 6) {
                console.log("⚠️ Ignorando ID de prueba no existente.");
                return new Response(null, { status: 200 });
            }

            // Procesar con un pequeño retraso de 2 segundos para asegurar que MP registró el pago
            setTimeout(() => {
                processPayment(cleanId).catch(err => console.error("❌ Error diferido:", err.message));
            }, 2000);
        }

        return new Response(null, { status: 200 });
    } catch (e) {
        return new Response(null, { status: 200 });
    }
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;
            if (!orderId) return;

            // Lógica de Supabase...
            const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
            if (!order || order.status === 'PAGADO') return;

            await supabase.from('orders').update({ status: 'PAGADO', payment_id: paymentId }).eq('id', orderId);
            
            // Lógica de Telegram...
            const botToken = import.meta.env.TELEGRAM_TOKEN;
            const chatId = import.meta.env.CHAT_ID;
            
            const mensaje = `🚨 <b>VENTA CONFIRMADA</b>\n💰 Total: $${payment.transaction_amount}\n🆔 Orden: ${orderId}`;
            
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
            });
        }
    } catch (error: any) {
        // Solo loguear si no es un 404 común de test
        if (error.status !== 404) {
            console.error("❌ Error MP:", error.message);
        }
    }
}