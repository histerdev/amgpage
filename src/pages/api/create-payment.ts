import type { APIRoute } from 'astro';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ 
    accessToken: import.meta.env.MP_ACCESS_TOKEN 
});

export const POST: APIRoute = async ({ request, url }) => {
    try {
        const { items, orderId, customerEmail } = await request.json();

        // VALIDACIÓN BÁSICA
        if (!items || items.length === 0) throw new Error("Carrito vacío");
        if (!orderId) throw new Error("Falta ID de Orden");

        // Detectar dominio automáticamente (Localhost o Producción)
        const origin = url.origin; 
        const webhookUrl = `${origin}/api/webhooks/mercadopago`;

        // CONSTRUCCIÓN DE LA PREFERENCIA
        const preference = await new Preference(client).create({
            body: {
                items: items.map((item: any) => ({
                    id: item.id || 'PRODUCT-ID',
                    title: item.title,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    currency_id: 'CLP',
                    description: item.description, // Talla y Calidad aquí
                    picture_url: item.image_url // Importante para visualización en MP
                })),
                external_reference: orderId, // EL VÍNCULO CON SUPABASE
                payer: {
                    email: customerEmail || 'cliente@email.com'
                },
 notification_url: "https://amgshoespreview.netlify.app/api/webhooks/mercadopago",
                back_urls: {
                    success: "https://amgshoespreview.netlify.app/pago-exitoso",
                    failure: "https://amgshoespreview.netlify.app/checkout",
                    pending: "https://amgshoespreview.netlify.app/checkout"
                },
                auto_return: "approved",
                statement_descriptor: "AMG SNEAKERS",
                metadata: {
                    order_id: orderId // Respaldo en metadata
                }
            }
        });

        return new Response(JSON.stringify({ init_point: preference.init_point }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("❌ Error creando preferencia:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500 
        });
    }
};