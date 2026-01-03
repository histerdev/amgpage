import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { sendAdminNotification } from '../../lib/notifications';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    if (id) {
        // Ejecutamos en background para responder rápido a MP
        processPayment(id).catch(console.error);
    }

    return new Response(null, { status: 200 });
};

async function processPayment(paymentId: string) {
    try {
        const payment = await new Payment(client).get({ id: paymentId });
        
        if (payment.status === 'approved') {
            // MENSAJE ULTRA SIMPLE (Como el que funcionó)
            const mensaje = `
💰 <b>¡VENTA REAL CONFIRMADA!</b>
➖➖➖➖➖➖➖➖➖➖➖
💵 <b>Monto:</b> $${payment.transaction_amount}
🆔 <b>Pago ID:</b> <code>${paymentId}</code>
📧 <b>Email:</b> ${payment.payer?.email}
➖➖➖➖➖➖➖➖➖➖➖
✅ Revisa el Panel Admin para detalles.`;

            await sendAdminNotification(mensaje);
        }
    } catch (e) {
        console.error("Error en Webhook:", e);
    }
}