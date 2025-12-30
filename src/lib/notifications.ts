const TELEGRAM_TOKEN = '8544855198:AAFKu-vSCX1Zp9bUuoIADL_lNXIzoAbYBAY';
const CHAT_ID = '7430626322';

export async function sendAdminNotification(message: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (e) {
    console.error('Error enviando notificación:', e);
  }
}