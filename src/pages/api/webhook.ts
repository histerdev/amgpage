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

        if (paymentId === "123456" || !paymentId) return new Response(null, { status: 200 });

        if (body.type === 'payment') {
            const payment = await new Payment(client).get({ id: paymentId });

            if (payment.status === 'approved') {
                const orderId = payment.external_reference;

                if (!orderId) {
                    console.error("ERROR: Pago sin external_reference");
                    return new Response(null, { status: 200 });
                }

                // Intentamos la actualización
                const { data, error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'PAGADO', // Probamos con mayúsculas por si tu base de datos es estricta
                        payment_id: paymentId.toString() 
                    })
                    .eq('id', orderId)
                    .select(); // El .select() es clave para confirmar si hubo cambios

                if (error) {
                    console.error("Error de Supabase:", error.message);
                } else if (data && data.length > 0) {
                    console.log(`✅ EXITO: Orden ${orderId} actualizada a PAGADO en Supabase.`);
                } else {
                    console.error(`⚠️ ATENCIÓN: Se encontró la orden ${orderId} pero no se aplicó el cambio. Revisa los RLS en Supabase.`);
                }
            }
        }

        return new Response(null, { status: 200 });
    } catch (err: any) {
        console.error("Fallo crítico:", err.message);
        return new Response(null, { status: 200 });
    }
};