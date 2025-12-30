import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { supabase } from '../../lib/supabase'; // Ajusta la ruta a tu lib

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('data.id') || url.searchParams.get('id');
        const type = url.searchParams.get('type');

        // Solo procesamos si la notificación es de un pago
        if (type === 'payment' && id) {
            const payment = await new Payment(client).get({ id });

            if (payment.status === 'approved') {
                const orderId = payment.external_reference;

                // ACTUALIZACIÓN EN SUPABASE
                const { error } = await supabase
                    .from('orders')
                    .update({ 
                        status: 'Pagado',
                        payment_id: id 
                    })
                    .eq('id', orderId);

                if (error) throw error;
            }
        }

        return new Response(null, { status: 200 });
    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response(null, { status: 400 });
    }
};