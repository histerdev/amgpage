import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        // Netlify enviará el dominio real (ej: https://tusitio.netlify.app)
        const origin = request.headers.get('origin');
        
        if (!origin) throw new Error("Origin header is missing");

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{
                    id: String(body.orderId),
                    title: String(body.name).toUpperCase(),
                    unit_price: Math.round(Number(body.price)),
                    quantity: 1,
                    currency_id: 'CLP'
                }],
                external_reference: String(body.orderId),
                back_urls: {
                    success: `${origin}/pago-exitoso`,
                    failure: `${origin}/checkout`,
                    pending: `${origin}/checkout`
                },
                auto_return: "approved",
                binary_mode: true
            }
        });

        return new Response(JSON.stringify({ 
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point 
        }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
};