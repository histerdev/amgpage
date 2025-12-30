import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        console.log("Webhook recibido body:", body);

        const paymentId = body.data?.id || body.id;
        const type = body.type;

        // Si es una prueba de Mercado Pago con ID "123456", respondemos 200 de inmediato
        if (paymentId === "123456") {
            console.log("Simulación de Mercado Pago detectada");
            return new Response(null, { status: 200 });
        }

        if (type === 'payment' && paymentId) {
            try {
                const payment = await new Payment(client).get({ id: paymentId });

                if (payment.status === 'approved') {
                    const orderId = payment.external_reference;

                    const { error } = await supabase
                        .from('orders')
                        .update({ 
                            status: 'Pagado',
                            payment_id: paymentId 
                        })
                        .eq('id', orderId);

                    if (error) throw error;
                    console.log(`Orden ${orderId} actualizada a Pagado`);
                }
            } catch (mpError) {
                console.error("Error al consultar el pago en MP:", mpError);
                // Respondemos 200 aunque el pago no exista para que MP deje de enviar la notificación
                return new Response(null, { status: 200 });
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Error crítico Webhook:", err.message);
        // Devolvemos 200 para que Mercado Pago no reintente infinitamente si hay un error de código
        return new Response(null, { status: 200 });
    }
};