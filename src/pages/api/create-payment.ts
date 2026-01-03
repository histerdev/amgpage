import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
    accessToken: import.meta.env.MP_ACCESS_TOKEN
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { items, orderId, customerEmail } = body;

        if (!items || items.length === 0) {
            return new Response(JSON.stringify({ error: "Carrito vacío" }), { status: 400 });
        }

        const preference = await new Preference(client).create({
            body: {
                items: items.map((item: any) => ({
                    id: item.id || 'prod',
                    title: item.title,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    currency_id: 'CLP',
                    description: item.description,
                    picture_url: item.image_url
                })),
                external_reference: orderId,
                payer: {
                    email: customerEmail
                },
                // USA LAS URLS DE TU NETLIFY DIRECTAMENTE AQUÍ
                notification_url: "https://amgshoespreview.netlify.app/api/webhooks/mercadopago",
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
        console.error("❌ Error en create-payment:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};