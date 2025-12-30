import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const { name, price, orderId } = await request.json();

        const preference = await new Preference(client).create({
            body: {
                items: [
                    {
                        id: orderId,
                        title: name,
                        quantity: 1,
                        unit_price: Number(price),
                        currency_id: 'CLP',
                    }
                ],
                // ESTA ES LA CLAVE: Aquí se vincula con tu UUID de Supabase
                external_reference: orderId, 
                notification_url: "https://amgshoespreview.netlify.app/api/webhook",
                back_urls: {
                    success: "https://amgshoespreview.netlify.app/pago-exitoso",
                    failure: "https://amgshoespreview.netlify.app/checkout",
                    pending: "https://amgshoespreview.netlify.app/checkout"
                },
                auto_return: "approved",
            }
        });

        return new Response(JSON.stringify({ init_point: preference.init_point }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error("Error creando preferencia:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};