// src/pages/api/notification.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    // Astro lee las variables del .env automáticamente aquí
    const token = import.meta.env.TELEGRAM_TOKEN;
    const chat = import.meta.env.CHAT_ID;

    try {
        const { message } = await request.json();

        if (!token || !chat) {
            return new Response(JSON.stringify({ error: "Configuración incompleta en el servidor" }), { status: 500 });
        }

        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const telegramRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chat,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const info = await telegramRes.json();

        return new Response(JSON.stringify({ success: telegramRes.ok, info }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}