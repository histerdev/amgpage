import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const GET: APIRoute = async ({ request }) => {
    // Verificación simple para evitar llamadas públicas (si se configura un CRON_SECRET en Vercel)
    const authHeader = request.headers.get("Authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || import.meta.env.CRON_SECRET}`;

    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        // Calculamos el inicio del día de ayer
        const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Eliminar órdenes 'Pendiente' con más de 24 horas
        const { data: dbOrders, error: fetchError } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("status", "Pendiente")
            .lt("created_at", past24Hours);

        if (fetchError) throw fetchError;

        if (dbOrders && dbOrders.length > 0) {
            const orderIds = dbOrders.map(o => o.id);

            // Borrar primero los items
            await supabaseAdmin.from("order_items").delete().in("order_id", orderIds);

            // Borrar las órdenes
            const { error: deleteError } = await supabaseAdmin.from("orders").delete().in("id", orderIds);
            if (deleteError) throw deleteError;

            console.log(`[CRON] Limpiadas ${orderIds.length} órdenes abandonadas.`);
        }

        return new Response(JSON.stringify({ success: true, deleted: dbOrders?.length || 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error("[CRON ERROR] Falló limpieza de órdenes:", message);
        return new Response(JSON.stringify({ error: message }), { status: 500 });
    }
};
