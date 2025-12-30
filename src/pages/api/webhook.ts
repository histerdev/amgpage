import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Mercado Pago envía la info en el BODY para Webhooks de CheckoutAPI
        const body = await request.json();
        console.log("Webhook recibido:", JSON.stringify(body));

        // 2. Extraer el ID del pago según la estructura que mandaste
        const paymentId = body.data?.id || body.id;
        const type = body.type;

        if (type === 'payment' && paymentId) {
            const payment = await new Payment(client).get({ id: paymentId });

            // 3. Verificar si el pago fue aprobado
            if (payment.status === 'approved') {
                const orderId = payment.external_reference;
                console.log(`Pago aprobado para la orden: ${orderId}`);

                const { error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'Pagado',
                        payment_id: paymentId 
                    })
                    .eq('id', orderId);

                if (error) {
                    console.error("Error actualizando Supabase:", error);
                    return new Response("Error DB", { status: 500 });
                }
            }
        }

        // 4. SIEMPRE devolver 200 o 201 a Mercado Pago para que no reintente
        return new Response(null, { status: 200 });

    } catch (err: any) {
        console.error("Error crítico en Webhook:", err.message);
        // Aunque falle tu lógica, a veces es mejor devolver 200 para detener el bucle de errores
        // mientras debugueas, pero por ahora devolvemos 400 para ver el fallo en el panel de MP.
        return new Response(`Error: ${err.message}`, { status: 400 });
    }
};