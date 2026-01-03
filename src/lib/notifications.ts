export async function sendAdminNotification(htmlMessage: string) {
  // Nombres EXACTOS según tu captura de Vercel
  const botToken = import.meta.env.TELEGRAM_TOKEN || process.env.TELEGRAM_TOKEN;
  const chatId = import.meta.env.CHAT_ID || process.env.CHAT_ID;

  if (!botToken || !chatId) {
    console.error("❌ Error: No se encontraron las variables CHAT_ID o TELEGRAM_TOKEN en Vercel");
    return;
  }

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
  } catch (error) {
    console.error("❌ Error enviando a Telegram:", error);
  }
}