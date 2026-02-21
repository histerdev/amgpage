import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Health check endpoint for uptime monitoring.
 * Returns 200 OK with basic status info.
 * Safe to expose publicly — no sensitive data returned.
 */
export const GET: APIRoute = async () => {
    return new Response(
        JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
            service: "AMG Sneakers API",
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        },
    );
};
