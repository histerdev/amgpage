import { p as processNotificationQueue } from '../../../chunks/notifications_CbAy7vn-.mjs';
import crypto from 'crypto';
export { renderers } from '../../../renderers.mjs';

const prerender = false;
function isValidCronToken(received, expected) {
  if (!received) return false;
  try {
    const receivedBuf = Buffer.from(received);
    const expectedBuf = Buffer.from(expected);
    const receivedHash = crypto.createHash("sha256").update(receivedBuf).digest();
    const expectedHash = crypto.createHash("sha256").update(expectedBuf).digest();
    return crypto.timingSafeEqual(receivedHash, expectedHash);
  } catch {
    return false;
  }
}
const GET = async ({ request }) => {
  const token = request.headers.get("authorization");
  const expected = `Bearer ${"B7ACDF09956A826892896F7F9C1EA9F9E308C83AE3B14F6BCF8C4777161A6E37"}`;
  if (!isValidCronToken(token, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await processNotificationQueue();
    return new Response(
      JSON.stringify({ success: true, message: "Notificaciones procesadas" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error en cron job:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
