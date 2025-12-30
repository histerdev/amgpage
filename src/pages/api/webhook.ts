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
            const payment = await new Payment(client).get({ id: paymentId });

            if (payment.status === 'approved') {
                const orderId = payment.external_reference; // Este es tu UUID
                
                console.log(`Actualizando UUID: ${orderId} a pagado`);

                const { data, error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'pagado'
                        // payment_id: paymentId.toString() <-- Activa esto SOLO tras agregar la columna en Supabase
                    })
                    .eq('id', orderId)
                    .select();

                if (error) {
                    console.error("Error de Supabase:", error.message);
                } else {
                    console.log("Resultado exitoso:", data);
                }
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Fallo crítico:", err.message);
        return new Response(null, { status: 200 });
    }
};