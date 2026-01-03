// src/lib/notifications.ts
const FALLBACK_TOKEN = '8544855198:AAFKu-vSCX1Zp9bUuoIADL_lNXIzoAbYBAY';
const FALLBACK_CHAT_ID = '7430626322';

export async function sendAdminNotification(message: string) {
  // Prioriza variables de entorno, si no usa las hardcodeadas (útil para debug)
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN || FALLBACK_TOKEN;
  const chatId = import.meta.env.TELEGRAM_CHAT_ID || FALLBACK_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("❌ Faltan credenciales de Telegram");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML', // CAMBIO CRÍTICO: Usar HTML es menos propenso a errores que Markdown
        disable_web_page_preview: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Error enviando a Telegram (API Response):", errorData);
    } else {
      console.log("✅ Notificación enviada a Telegram");
    }
  } catch (error) {
    console.error("❌ Error de red con Telegram:", error);
  }
}