import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { s as sendNotification } from '../../chunks/notifications_CbAy7vn-.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const mpClient = new MercadoPagoConfig({
  accessToken: "TEST-135411423533318-122915-da7b89c2383779fd63383d53c2be4375-2170385068"
});
const supabaseAdmin = createClient(
  "https://nefkzzaqzmzkpoqfyfoj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmt6emFxem16a3BvcWZ5Zm9qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Njk2ODgwOSwiZXhwIjoyMDgyNTQ0ODA5fQ.QOjFSTdYSP1oLKWb7pB6FdkWHfUMeTrDsqqL3OMfEqA"
);
const POST = async ({ request }) => {
  try {
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");
    if (!xSignature || !xRequestId) {
      console.warn("[SECURITY] Webhook sin headers de firma");
      return new Response(
        JSON.stringify({ error: "Missing signature headers" }),
        { status: 401 }
      );
    }
    const bodyText = await request.text();
    if (!validateMercadoPagoSignature(xSignature, xRequestId, bodyText)) {
      console.warn(`[SECURITY] Firma inválida. RequestId: ${xRequestId}`);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401
      });
    }
    let bodyParsed;
    try {
      bodyParsed = JSON.parse(bodyText);
    } catch {
      return new Response(null, { status: 200 });
    }
    const notificationType = bodyParsed.type || bodyParsed.topic;
    const paymentId = bodyParsed.data?.id || bodyParsed.id;
    if (notificationType === "payment" && paymentId) {
      const cleanId = String(paymentId).trim();
      if (cleanId === "1234567890" || cleanId.length < 5) {
        return new Response(null, { status: 200 });
      }
      await delay(2e3);
      await processPayment(cleanId);
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("🔥 Error crítico en webhook:", message);
    return new Response(null, { status: 200 });
  }
};
function validateMercadoPagoSignature(signature, requestId, body) {
  {
    console.error("⚠️ MP_WEBHOOK_SECRET no configurado");
    return false;
  }
}
async function processPayment(paymentId) {
  try {
    const payment = await new Payment(mpClient).get({ id: paymentId });
    if (payment.status !== "approved") {
      return;
    }
    const orderId = payment.external_reference;
    if (!orderId) {
      return;
    }
    const { data: order, error: orderError } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
    if (orderError || !order) {
      console.error("Orden no encontrada:", orderId);
      return;
    }
    const { data: items } = await supabaseAdmin.from("order_items").select("*").eq("order_id", orderId);
    const { error: updateError } = await supabaseAdmin.from("orders").update({
      status: "Completado",
      mp_payment_id: paymentId,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", orderId);
    if (updateError) {
      console.error("Error actualizando orden:", updateError.message);
      return;
    }
    const { data: profile } = await supabaseAdmin.from("profiles").select("telegram_id").eq("email", order.email).single();
    const productNames = items?.map(
      (item) => `${item.product_name} (Talla ${item.size})`
    ) || [];
    await sendNotification({
      orderId,
      type: "payment_confirmed",
      recipient: {
        email: order.email,
        telegramId: profile?.telegram_id,
        customerName: order.customer_name
      },
      data: {
        orderNumber: orderId.slice(0, 8),
        totalPrice: order.total_price,
        productNames
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Error en processPayment:`, message);
  }
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
