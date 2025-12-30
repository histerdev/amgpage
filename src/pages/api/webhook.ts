import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const paymentId = body.data?.id || body.id;

        if (paymentId === "123456") return new Response(null, { status: 200 });

        if (body.type === 'payment' && paymentId) {
            // Obtener datos extendidos del pago desde MP
            const payment = await new Payment(client).get({ id: paymentId });

            if (payment.status === 'approved') {
                const orderId = payment.external_reference; 

                // Validar que el ID no sea null para evitar error de sintaxis UUID
                if (!orderId || orderId === "null") {
                    console.error("Pago aprobado pero sin external_reference (UUID)");
                    return new Response(null, { status: 200 });
                }

                console.log(`Actualizando orden ${orderId} a pagado`);

                const { data, error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'pagado', // Texto exacto en minúscula
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId)
                    .select();

                if (error) {
                    // Si falla aquí, revisa que la columna 'payment_id' exista
                    console.error("Error Supabase:", error.message);
                } else {
                    console.log("Orden actualizada con éxito:", data);
                }
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Error crítico Webhook:", err.message);
        return new Response(null, { status: 200 });
    }
};