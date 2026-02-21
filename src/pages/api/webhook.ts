import type { APIRoute } from "astro";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "../../lib/notifications";
import crypto from "crypto";

export const prerender = false;

// ✅ Configuración segura
const mpClient = new MercadoPagoConfig({
  accessToken: import.meta.env.MP_ACCESS_TOKEN!,
});

const MP_WEBHOOK_SECRET = import.meta.env.MP_WEBHOOK_SECRET;

// ✅ Admin client para el webhook (no hay sesión de usuario)
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Invalid content-type" }), {
        status: 415,
      });
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > 200_000) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
      });
    }

    // 1️⃣ VALIDAR FIRMA DE MERCADO PAGO
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    if (!xSignature || !xRequestId) {
      console.warn("[SECURITY] Webhook sin headers de firma");
      return new Response(
        JSON.stringify({ error: "Missing signature headers" }),
        { status: 401 },
      );
    }

    const bodyText = await request.text();

    // Validar firma
    if (!validateMercadoPagoSignature(xSignature, xRequestId, bodyText)) {
      console.warn(`[SECURITY] Firma inválida. RequestId: ${xRequestId}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
      });
    }

    // 2️⃣ PARSEAR BODY
    let bodyParsed;
    try {
      bodyParsed = JSON.parse(bodyText);
    } catch {
      return new Response(null, { status: 200 });
    }

    const notificationType = bodyParsed.type || bodyParsed.topic;
    const paymentId = bodyParsed.data?.id || bodyParsed.id;

    // 3️⃣ PROCESAR SOLO PAGOS
    if (notificationType === "payment" && paymentId) {
      const cleanId = String(paymentId).trim();

      // Filtros anti-spam
      if (cleanId === "1234567890" || cleanId.length < 5) {
        return new Response(null, { status: 200 });
      }

      // Esperar a que Mercado Pago sincronice
      await delay(2000);

      // Procesar pago
      await processPayment(cleanId);
    }

    return new Response(null, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("🔥 Error crítico en webhook:", message);
    return new Response(null, { status: 200 });
  }
};

/**
 * ✅ VALIDA FIRMA DE MERCADO PAGO
 */
function validateMercadoPagoSignature(
  signature: string,
  requestId: string,
  body: string,
): boolean {
  if (!MP_WEBHOOK_SECRET) {
    console.error("⚠️ MP_WEBHOOK_SECRET no configurado");
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
    hmac.update(`${requestId}.${body}`);
    const hash = hmac.digest("hex");

    // SECURITY FIX: timingSafeEqual throws if buffers differ in byte length.
    // Return false immediately on length mismatch to avoid crash-path bypass.
    const sigBuf  = Buffer.from(signature);
    const hashBuf = Buffer.from(hash);
    if (sigBuf.length !== hashBuf.length) return false;

    return crypto.timingSafeEqual(sigBuf, hashBuf);
  } catch {
    console.error("Error validando firma");
    return false;
  }
}

/**
 * ✅ PROCESA PAGOS APROBADOS
 * Ahora usa supabaseAdmin (service role) en lugar del SSR client
 */
async function processPayment(paymentId: string) {
  try {
    // 1️⃣ OBTENER PAGO DE MERCADO PAGO
    const payment = await new Payment(mpClient).get({ id: paymentId });

    if (payment.status !== "approved") {
      return;
    }

    if (payment.status_detail === "accredited" && payment.status !== "approved") {
      return;
    }

    if (payment.metadata?.integration_source && payment.metadata.integration_source !== "checkout_pro") {
      return;
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      return;
    }

    // 2️⃣ OBTENER ORDEN DE BD (con admin client, bypassa RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Orden no encontrada:", orderId);
      return;
    }
    if (order.status === "Completado" && order.mp_payment_id) {
      console.log(`[IDEMPOTENT] Order ${orderId} already processed`);
      return; // No procesar de nuevo
    }
    // 3️⃣ OBTENER ITEMS DE LA ORDEN
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    // 4️⃣ ACTUALIZAR ESTADO A PAGADO
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "Completado",
        mp_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error actualizando orden:", updateError.message);
      return;
    }

    // 5️⃣ OBTENER TELEGRAM_ID DEL USUARIO
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("telegram_id")
      .eq("email", order.email)
      .single();

    // 6️⃣ ENVIAR NOTIFICACIÓN
    const productNames =
      items?.map(
        (item: { product_name: string; size: string }) =>
          `${item.product_name} (Talla ${item.size})`,
      ) || [];

    await sendNotification({
      orderId,
      type: "payment_confirmed",
      recipient: {
        email: order.email,
        telegramId: profile?.telegram_id,
        customerName: order.customer_name,
      },
      data: {
        orderNumber: orderId.slice(0, 8),
        totalPrice: order.total_price,
        productNames,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error en processPayment:`, message);
  }
}

/**
 * ✅ DELAY HELPER
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}