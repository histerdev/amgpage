import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationPayload {
  orderId: string;
  type: 'order_created' | 'payment_confirmed' | 'qc_ready' | 'order_shipped';
  recipient: {
    email: string;
    telegramId?: string;
    customerName: string;
  };
  data: {
    orderNumber: string;
    totalPrice?: number;
    productNames?: string[];
    message?: string;
  };
}

/**
 * ✅ ENVIAR NOTIFICACIÓN CON REINTENTOS AUTOMÁTICOS
 */
export async function sendNotification(payload: NotificationPayload) {
  try {

    // 1️⃣ INTENTAR TELEGRAM
    const telegramSent = await sendTelegramNotification(payload);

    // 2️⃣ REGISTRAR EN BD
    const notificationRecord = {
      order_id: payload.orderId,
      notification_type: payload.type,
      channel: 'telegram',
      recipient: payload.recipient.telegramId || payload.recipient.email,
      status: telegramSent ? 'sent' : 'failed',
      message: buildTelegramMessage(payload),
      error_message: telegramSent ? null : 'Telegram envío fallido',
      sent_at: telegramSent ? new Date().toISOString() : null,
      retry_count: 0,
    };

    const { error: dbError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationRecord);

    if (dbError) {
      console.error('Error registrando notificación:', dbError);
    }

    // 3️⃣ SI TELEGRAM FALLÓ, ENCOLAR PARA REINTENTOS
    if (!telegramSent) {
      console.warn('⚠️ Telegram falló, encolando para reintentos...');
      await enqueueFallbackNotification(payload);
    }

    return telegramSent;

  } catch (error: any) {
    console.error('❌ Error en sendNotification:', error);
    return false;
  }
}

/**
 * ✅ ENVIAR VÍA TELEGRAM
 */
async function sendTelegramNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = payload.recipient.telegramId;

    if (!botToken || !chatId) {
      console.warn('⚠️ Telegram no configurado');
      return false;
    }

    const message = buildTelegramMessage(payload);
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return false;
    }

    return true;

  } catch (error: any) {
    return false;
  }
}

/**
 * ✅ ENVIAR VÍA EMAIL (FALLBACK)
 */
async function sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.recipient.email,
        type: payload.type,
        data: payload.data,
      }),
    });

    if (!response.ok) {
      return false;
    }

    return true;

  } catch (error: any) {
    return false;
  }
}

/**
 * ✅ ENCOLAR PARA REINTENTOS
 */
async function enqueueFallbackNotification(payload: NotificationPayload) {
  try {
    // Guardar en tabla de cola de reintentos
    const { error } = await supabaseAdmin
      .from('notification_queue')
      .insert({
        order_id: payload.orderId,
        notification_type: payload.type,
        payload: payload,
        status: 'queued',
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
        retry_count: 0,
      });

    if (error) {
      return;
    }


  } catch (error: any) {
  }
}

/**
 * ✅ PROCESAR COLA DE REINTENTOS (Ejecutar cada 5 minutos)
 */
export async function processNotificationQueue() {
  try {

    // Obtener notificaciones pendientes
    const { data: queuedNotifications, error } = await supabaseAdmin
      .from('notification_queue')
      .select('*')
      .eq('status', 'queued')
      .lt('next_retry_at', new Date().toISOString())
      .lt('retry_count', 3);

    if (error) {
      console.error('Error obteniendo cola:', error);
      return;
    }

    if (!queuedNotifications || queuedNotifications.length === 0) {
      return;
    }


    for (const item of queuedNotifications) {
      const payload = item.payload as NotificationPayload;
      const retryCount = item.retry_count || 0;

      // Intentar Telegram de nuevo
      const telegramSuccess = await sendTelegramNotification(payload);

      if (telegramSuccess) {
        // Marcar como enviado
        await supabaseAdmin
          .from('notification_queue')
          .update({ status: 'sent' })
          .eq('id', item.id);

      } else {
        // Si aún falla, enviar por email como fallback
        const emailSuccess = await sendEmailNotification(payload);

        if (emailSuccess) {
          await supabaseAdmin
            .from('notification_queue')
            .update({ status: 'sent', retry_count: retryCount + 1 })
            .eq('id', item.id);

        } else {
          // Incrementar reintentos
          const nextRetry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos más

          await supabaseAdmin
            .from('notification_queue')
            .update({
              retry_count: retryCount + 1,
              next_retry_at: nextRetry.toISOString(),
              status: retryCount + 1 >= 3 ? 'failed' : 'queued',
            })
            .eq('id', item.id);

          console.warn(
            `⚠️ Reintento ${retryCount + 1}/3 fallido para orden ${payload.orderId}`
          );

          // Alertar a admin si fallan todos los reintentos
          if (retryCount + 1 >= 3) {
            await alertAdminFailedNotification(payload);
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Error en processNotificationQueue:', error);
  }
}

/**
 * ✅ ALERTAR A ADMIN SI FALLA TODO
 */
async function alertAdminFailedNotification(payload: NotificationPayload) {
  try {
    const adminTelegramId = import.meta.env.ADMIN_TELEGRAM_ID;
    const botToken = import.meta.env.TELEGRAM_BOT_TOKEN;

    if (!adminTelegramId || !botToken) {
      console.error('⚠️ Admin telegram no configurado');
      return;
    }

    const alertMessage = `
⚠️ *ALERTA: Notificación Fallida*

Orden: ${payload.data.orderNumber}
Cliente: ${payload.recipient.customerName}
Email: ${payload.recipient.email}
Tipo: ${payload.type}

La notificación falló después de 3 reintentos.
    `;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminTelegramId,
        text: alertMessage,
        parse_mode: 'Markdown',
      }),
    });


  } catch (error: any) {
  }
}

/**
 * ✅ CONSTRUIR MENSAJE TELEGRAM
 */
function buildTelegramMessage(payload: NotificationPayload): string {
  const messages: Record<string, string> = {
    order_created: `
✅ *Nueva Orden Creada*

Orden: ${payload.data.orderNumber}
Cliente: ${payload.recipient.customerName}
Total: $${payload.data.totalPrice?.toLocaleString('es-CL')}

${payload.data.productNames?.map(p => `• ${p}`).join('\n')}

Tu orden está siendo procesada.
    `,
    payment_confirmed: `
💚 *Pago Confirmado*

Orden: ${payload.data.orderNumber}
Total: $${payload.data.totalPrice?.toLocaleString('es-CL')}

¡Gracias por tu compra! Procederemos con el QC.
    `,
    qc_ready: `
📸 *QC Listo*

Orden: ${payload.data.orderNumber}

${payload.data.message || 'Las fotos de calidad están listas para revisar.'}
    `,
    order_shipped: `
📦 *Orden Enviada*

Orden: ${payload.data.orderNumber}

${payload.data.message || 'Tu orden ha sido enviada.'}
    `,
  };

  return messages[payload.type] || 'Nueva notificación';
}

/**
 * ✅ OBTENER ESTADO DE NOTIFICACIONES (Para dashboard)
 */
export async function getNotificationStatus(orderId: string) {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo notificaciones:', error);
      return [];
    }

    return notifications || [];

  } catch (error: any) {
    console.error('Error en getNotificationStatus:', error);
    return [];
  }
}