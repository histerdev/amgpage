import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        
        // Manejar tanto body.data.id como body.id dependiendo del evento
        const paymentId = body.data?.id || body.id;

        // Ignorar notificaciones de prueba
        if (paymentId === "123456" || !paymentId) {
            return new Response(null, { status: 200 });
        }

        if (body.type === 'payment') {
            const payment = await new Payment(client).get({ id: paymentId });

            if (payment.status === 'approved') {
                const orderId = payment.external_reference;

                if (!orderId) {
                    console.error("ERROR: El pago no tiene external_reference");
                    return new Response(null, { status: 200 });
                }

                // Actualizar en Supabase usando tus columnas reales
                const { error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'pagado', 
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId);

                if (error) {
                    console.error("Error actualizando Supabase:", error.message);
                } else {
                    console.log(`Orden ${orderId} marcada como pagada.`);
                }
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Error crítico en Webhook:", err.message);
        return new Response(null, { status: 200 });
    }
};