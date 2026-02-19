import type { APIRoute } from "astro";
import { processNotificationQueue } from "../../../lib/notifications";
import crypto from "crypto";

export const prerender = false;

/**
 * Comparación timing-safe para tokens de autenticación.
 * Previene ataques de temporización donde un atacante mide
 * diferencias de microsegundos para inferir el token.
 */
function isValidCronToken(received: string | null, expected: string): boolean {
  if (!received) return false;

  try {
    const receivedBuf = Buffer.from(received);
    const expectedBuf = Buffer.from(expected);

    // Si los buffers tienen diferente longitud, timingSafeEqual lanza error.
    // Igualamos longitudes hasheando ambos valores.
    const receivedHash = crypto.createHash("sha256").update(receivedBuf).digest();
    const expectedHash = crypto.createHash("sha256").update(expectedBuf).digest();

    return crypto.timingSafeEqual(receivedHash, expectedHash);
  } catch {
    return false;
  }
}

export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get("authorization");
  const expected = `Bearer ${import.meta.env.CRON_SECRET}`;

  if (!isValidCronToken(token, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await processNotificationQueue();

    return new Response(
      JSON.stringify({ success: true, message: "Notificaciones procesadas" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error en cron job:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};