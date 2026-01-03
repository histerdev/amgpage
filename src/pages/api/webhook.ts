// En src/lib/notifications.ts o en tu webhook

export async function sendAdminNotification(message: string) {
  // Intenta leer de Astro, y si no, del sistema de Node (Vercel)
  const botToken = import.meta.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    console.error("❌ Error: El Token de Telegram no llegó al servidor");
    return;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    })
  });
}