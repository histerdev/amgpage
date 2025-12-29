import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Usamos el token de tu .env
const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const preference = new Preference(client);

        // Creamos la preferencia
        const result = await preference.create({
            body: {
                items: [{
                    id: body.orderId || 'item-123',
                    title: body.name.toUpperCase(),
                    unit_price: Number(body.price),
                    quantity: 1,
                    currency_id: 'CLP'
                }],
                // IMPORTANTE: En desarrollo, a veces es mejor usar URLs simples 
                // o incluso omitirlas si dan problemas con localhost
                back_urls: {
                    success: "https://google.com", // Solo para probar que el link se genera
                    failure: "https://google.com",
                },
                auto_return: 'approved',
            }
        });

        return new Response(JSON.stringify({ init_point: result.init_point }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        // Esto imprimirá el error REAL de Mercado Pago en tu terminal negra de VS Code
        console.error("ERROR DE MERCADO PAGO:", error.response?.data || error);
        
        return new Response(JSON.stringify({ 
            error: 'Error interno',
            details: error.response?.data || error.message 
        }), { status: 500 });
    }
};