import type { APIRoute } from 'astro';
import { processNotificationQueue } from '../../../lib/notifications';

export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization');
  if (token !== `Bearer ${import.meta.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await processNotificationQueue();

    return new Response(
      JSON.stringify({ success: true, message: 'Notificaciones procesadas' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error en cron job:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};