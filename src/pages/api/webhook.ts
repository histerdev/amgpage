// src/pages/api/webhooks/mercadopago.ts
import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';
import { sendAdminNotification } from '../../lib/notifications';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');
    const type = url.searchParams.get('type');

    // MercadoPago envía 'payment' o 'notification'
    if (id && (type === 'payment' || !type)) {
        processPayment(id).catch(console.error);
    }

    return new Response(null, { status: 200 });
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            const orderId = payment.external_reference;

            // 1. Obtener datos de la orden
            const { data: order } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (order?.status === 'PAGADO') return;

            // 2. Marcar como pagado
            await supabase
                .from('orders')
                .update({ status: 'PAGADO', payment_id: paymentId })
                .eq('id', orderId);

            // 3. Obtener items para el mensaje
            const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', orderId);

            const itemsText = items?.map(i => 
                `👟 <b>${i.product_name}</b> (Talla: ${i.size})`
            ).join('\n') || "Sin detalles";

            // 4. EL MENSAJE (Igual al estilo que te funcionó)
            const mensaje = `
<b>💰 ¡NUEVA VENTA!</b>
➖➖➖➖➖➖➖➖
<b>Cliente:</b> ${order?.customer_name || 'N/A'}
<b>Monto:</b> $${payment.transaction_amount}
<b>Pedido:</b> <code>${orderId}</code>

<b>Productos:</b>
${itemsText}
➖➖➖➖➖➖➖➖
✅ Pago Confirmado`;

            await sendAdminNotification(mensaje);
        }
    } catch (e) {
        console.error("Error procesando pago:", e);
    }
}