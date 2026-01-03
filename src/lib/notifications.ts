// src/lib/notifications.ts

export async function sendAdminNotification(htmlMessage: string) {
  // Usamos el token que te funcionó en el Debugger
  const botToken = '8170505944:AAEYPu3FtEv1x5aduVXmVOThymzBWyy4zIU';
  const chatId = '7430626322';

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    console.log("✅ Notificación enviada");
  } catch (error) {
    console.error("❌ Error de red con Telegram:", error);
  }
}