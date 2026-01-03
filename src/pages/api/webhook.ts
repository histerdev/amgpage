import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Obtener los parámetros del queryString (MP a veces envía data aquí)
        const url = new URL(request.url);
        const topic = url.searchParams.get('topic') || url.searchParams.get('type');
        const queryId = url.searchParams.get('id') || url.searchParams.get('data.id');

        // 2. Obtener el cuerpo
        const body = await request.json();

        // 3. Normalizar datos (MP es inconsistente entre params y body)
        // Priorizamos el body, si no hay, miramos la URL
        const notificationType = body.type || body.topic || topic;
        const dataId = body.data?.id || body.id || queryId;

        console.log(`📨 Webhook recibido: Tipo=[${notificationType}] ID=[${dataId}]`);

        // --- FILTRO CRÍTICO PARA EVITAR 404 ---
        
        // Si NO es un pago explícito, lo ignoramos y devolvemos 200.
        // Esto filtra 'merchant_order', 'subscription', etc.
        if (notificationType !== 'payment') {
            console.log(`ℹ️ Ignorando notificación de tipo: ${notificationType}`);
            return new Response(null, { status: 200 });
        }

        // Si no hay ID, ignoramos
        if (!dataId) {
            return new Response(null, { status: 200 });
        }

        const cleanId = String(dataId).trim();

        // Filtro de IDs de prueba basura
        if (cleanId === "1234567890" || cleanId.length < 5) {
            return new Response(null, { status: 200 });
        }

        // 4. Procesar el pago
        // Usamos setTimeout para dar tiempo a que la base de datos de MP replique la info en modo pruebas
        setTimeout(() => {
            processPayment(cleanId).catch(err => console.error(`❌ Error Async Procesando ${cleanId}:`, err.message));
        }, 2000); 

        return new Response(null, { status: 200 });

    } catch (e: any) {
        console.error("🔥 Error general webhook:", e.message);
        // Siempre devolver 200 a MP para que no reintente infinitamente
        return new Response(null, { status: 200 });
    }
};

async function processPayment(paymentId: string) {
    try {
        // Consultamos el pago a MP
        const payment = await new Payment(client).get({ id: paymentId });

        console.log(`💳 Estado del pago ${paymentId}: ${payment.status}`);

        if (payment.status === 'approved') {
            const orderId = payment.external_reference;
            
            if (!orderId) {
                console.log("⚠️ Pago sin external_reference (Order ID)");
                return;
            }

            // 1. Verificar si ya existe en Supabase
            const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
            
            // Si no existe la orden o ya está pagada, paramos.
            if (!order) {
                 console.error(`❌ La orden ${orderId} no existe en base de datos.`);
                 return;
            }
            if (order.status === 'PAGADO') {
                console.log("✅ La orden ya estaba marcada como pagada.");
                return;
            }

            // 2. Actualizar Supabase
            const { error: dbError } = await supabase
                .from('orders')
                .update({ status: 'PAGADO', payment_id: paymentId })
                .eq('id', orderId);

            if (dbError) {
                console.error("❌ Error DB:", dbError.message);
                return;
            }

            console.log(`🎉 Orden ${orderId} actualizada a PAGADO`);

            // 3. Notificar Telegram
            const botToken = import.meta.env.TELEGRAM_TOKEN;
            const chatId = import.meta.env.CHAT_ID;

            if (botToken && chatId) {
                const mensaje = `🚨 <b>VENTA CONFIRMADA (TEST)</b>\n💰 Total: $${payment.transaction_amount}\n🆔 Orden: ${orderId}`;
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' })
                });
            }
        }
    } catch (error: any) {
        // Solo loguear errores que NO sean 404 (porque el 404 ya lo filtramos arriba, 
        // pero si ocurre aquí, es un error real de red o credenciales)
        console.error(`❌ Error consultando MP para ID ${paymentId}:`, error.message);
    }
}