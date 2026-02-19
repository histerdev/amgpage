import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createSupabaseServerClient } from '../../lib/supabase-ssr';
import { sendNotification } from '../../lib/notifications';
import crypto from 'crypto';

// ✅ Configuración segura
const mpClient = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN!,
});

const MP_WEBHOOK_SECRET = import.meta.env.MP_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1️⃣ VALIDAR FIRMA DE MERCADO PAGO
        const xSignature = request.headers.get('x-signature');
        const xRequestId = request.headers.get('x-request-id');
        
        if (!xSignature || !xRequestId) {
            console.warn('[SECURITY] Webhook sin headers de firma');
            return new Response(
                JSON.stringify({ error: 'Missing signature headers' }), 
                { status: 401 }
            );
        }

        const bodyText = await request.text();

        // Validar firma
        if (!validateMercadoPagoSignature(xSignature, xRequestId, bodyText)) {
            console.warn(`[SECURITY] Firma inválida. RequestId: ${xRequestId}`);
            return new Response(
                JSON.stringify({ error: 'Invalid signature' }), 
                { status: 401 }
            );
        }

        // 2️⃣ PARSEAR BODY
        let bodyParsed;
        try {
            bodyParsed = JSON.parse(bodyText);
        } catch (e) {
            return new Response(null, { status: 200 });
        }

        const notificationType = bodyParsed.type || bodyParsed.topic;
        const paymentId = bodyParsed.data?.id || bodyParsed.id;


        // 3️⃣ PROCESAR SOLO PAGOS
        if (notificationType === 'payment' && paymentId) {
            const cleanId = String(paymentId).trim();
            
            // Filtros anti-spam
            if (cleanId === '1234567890' || cleanId.length < 5) {
                return new Response(null, { status: 200 });
            }

            // Esperar a que Mercado Pago sincronice
            await delay(2000);

            // Procesar pago
            await processPayment(cleanId, request);
        }

        return new Response(null, { status: 200 });

    } catch (error: any) {
        console.error('🔥 Error crítico en webhook:', error.message);
        return new Response(null, { status: 200 });
    }
};

/**
 * ✅ VALIDA FIRMA DE MERCADO PAGO
 */
function validateMercadoPagoSignature(
    signature: string,
    requestId: string,
    body: string
): boolean {
    if (!MP_WEBHOOK_SECRET) {
        console.error('⚠️ MP_WEBHOOK_SECRET no configurado');
        return false;
    }

    try {
        const hmac = crypto.createHmac('sha256', MP_WEBHOOK_SECRET);
        hmac.update(`${requestId}.${body}`);
        const hash = hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(hash)
        );
    } catch (error) {
        console.error('Error validando firma:', error);
        return false;
    }
}

/**
 * ✅ PROCESA PAGOS APROBADOS
 */
async function processPayment(paymentId: string, request: Request) {
    try {

        // 1️⃣ OBTENER PAGO DE MERCADO PAGO
        const payment = await new Payment(mpClient).get({ id: paymentId });


        if (payment.status !== 'approved') {
            return;
        }

        const orderId = payment.external_reference;
        if (!orderId) {
            return;
        }

        // 2️⃣ OBTENER ORDEN DE BD
        const responseHeaders = new Headers();
        const supabase = createSupabaseServerClient(request, responseHeaders);

        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return;
        }


        // 3️⃣ OBTENER ITEMS DE LA ORDEN
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

        // 4️⃣ ACTUALIZAR ESTADO A PAGADO
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'Completado',
                mp_payment_id: paymentId,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateError) {
            return;
        }


        // 5️⃣ OBTENER TELEGRAM_ID DEL USUARIO
        const { data: profile } = await supabase
            .from('profiles')
            .select('telegram_id')
            .eq('email', order.email)
            .single();

        // 6️⃣ ENVIAR NOTIFICACIÓN CON NUEVO SISTEMA ROBUSTO
        
        const productNames = items?.map((item: any) => 
            `${item.product_name} (Talla ${item.size})`
        ) || [];

        await sendNotification({
            orderId,
            type: 'payment_confirmed',
            recipient: {
                email: order.email,
                telegramId: profile?.telegram_id,
                customerName: order.customer_name,
            },
            data: {
                orderNumber: orderId.slice(0, 8),
                totalPrice: order.total_price,
                productNames,
            },
        });


    } catch (error: any) {
        console.error(`❌ Error en processPayment:`, error.message);
    }
}

/**
 * ✅ DELAY HELPER
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}