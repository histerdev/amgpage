import type { APIRoute } from "astro";
import { cleanupExpiredEntries } from "../../../lib/rateLimit";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // Verificar que viene del cron de Vercel
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${import.meta.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const deleted = await cleanupExpiredEntries();
    return new Response(
      JSON.stringify({
        success: true,
        deleted,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};