import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    // 1. Obtenemos el ID de MercadoPago
    const url = new URL(request.url);
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');

    // USAMOS LOS VALORES DIRECTOS (Para descartar que el error sea la Variable de Entorno)
    const TOKEN = "8170505944:AAEYPu3FtEv1x5aduVXmVOThymzBWyy4zIU";
    const CHAT_ID = "7430626322";

    if (id) {
        // Enviar notificación básica inmediata
        try {
            await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: `🔔 <b>¡Webhook Recibido!</b>\nID de pago detectado: <code>${id}</code>\nEstado: Procesando...`,
                    parse_mode: 'HTML'
                })
            });
        } catch (e) {
            console.error("Error enviando a Telegram:", e);
        }
    }

    return new Response(JSON.stringify({ received: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};