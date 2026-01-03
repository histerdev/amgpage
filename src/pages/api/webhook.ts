// src/pages/api/webhook.ts
import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

// Función de espera que SÍ funciona en Vercel (bloquea la ejecución)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const POST: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const topic = url.searchParams.get('topic') || url.searchParams.get('type');
        const queryId = url.searchParams.get('id') || url.searchParams.get('data.id');
        const body = await request.json();

        const notificationType = body.type || body.topic || topic;
        const dataId = body.data?.id || body.id || queryId;

        // Log inicial para ver que llegó
        console.log(`📨 Webhook: Tipo=[${notificationType}] ID=[${dataId}]`);

        if (notificationType === 'payment' && dataId) {
            const cleanId = String(dataId).trim();
            
            // Filtros de seguridad
            if (cleanId === "1234567890" || cleanId.length < 5) {
                return new Response(null, { status: 200 });
            }

            console.log(`⏳ Esperando 2s antes de consultar MP para ID: ${cleanId}...`);
            
            // 1. Esperamos 2 segundos BLOQUEANDO la respuesta (seguro en Vercel)
            await delay(2000);

            // 2. Procesamos y ESPERAMOS a que termine antes de responder OK
            await processPayment(cleanId);
            
            console.log("🏁 Proceso finalizado correctamente.");
        }

        return new Response(null, { status: 200 });

    } catch (e: any) {
        console.error("🔥 Error crítico:", e.message);
        return new Response(null, { status: 200 });
    }
};

async function processPayment(paymentId: string) {
    try {
        console.log(`🔍 Consultando API de Mercado Pago para ${paymentId}...`);
        const payment = await new Payment(client).get({ id: paymentId });

        console.log(`💳 Estado: ${payment.status} | Order ID (Ref): ${payment.external_reference}`);

        if (payment.status === 'approved') {
            const orderId = payment.external_reference;
            
            if (!orderId) {
                console.error("⚠️ Error: El pago no tiene 'external_reference' (Order ID).");
                return;
            }

            // --- Lógica Supabase ---
            console.log(`base de datos buscando orden: ${orderId}`);
            const { data: order, error: dbError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (dbError || !order) {
                console.error("❌ Error DB o Orden no encontrada:", dbError?.message);
                return;
            }

            if (order.status !== 'PAGADO') {
                await supabase.from('orders').update({ status: 'PAGADO', payment_id: paymentId }).eq('id', orderId);
                console.log("💾 DB Actualizada a PAGADO.");
            } else {
                console.log("ℹ️ La orden ya estaba pagada.");
            }

            // --- Lógica Telegram (Con Logs detallados) ---
            const botToken = import.meta.env.TELEGRAM_TOKEN;
            const chatId = import.meta.env.CHAT_ID;

            console.log(`🤖 Intentando enviar Telegram. Token existe: ${!!botToken}, ChatID existe: ${!!chatId}`);

            if (botToken && chatId) {
                const mensaje = `🚨 <b>VENTA EXITOSA</b>\n💰 Total: $${payment.transaction_amount}\n🆔 Orden: ${orderId}`;
                
                const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
                });

                const tgData = await tgResponse.json();
                
                if (!tgResponse.ok) {
                    console.error("❌ Error enviando a Telegram:", JSON.stringify(tgData));
                } else {
                    console.log("✅ Mensaje de Telegram enviado con éxito.");
                }
            } else {
                console.error("⚠️ Faltan variables de entorno TELEGRAM_TOKEN o CHAT_ID");
            }
        } else {
            console.log(`ℹ️ El pago no está aprobado, está: ${payment.status}`);
        }
    } catch (error: any) {
        console.error(`❌ Error en processPayment:`, error.message);
    }
}