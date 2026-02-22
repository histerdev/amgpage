/**
 * 🛡️ Rate Limit PERSISTENTE usando Supabase
 *
 * ¿Por qué no en memoria?
 * En Vercel Serverless cada invocación es stateless.
 * Un objeto en RAM muere al finalizar la función.
 * Supabase persiste entre invocaciones y es compartido por todas las instancias.
 *
 * Requisito: crear la tabla rate_limit_entries en Supabase (ver SQL abajo)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter?: number;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────
// RATE LIMIT GENÉRICO (Supabase-backed)
// ─────────────────────────────────────────────────────────────────
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  // 1. Contar requests en la ventana de tiempo
  const { count, error: countError } = await supabaseAdmin
    .from("rate_limit_entries")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart.toISOString());

  if (countError) {
    // SECURITY FIX: Add critical security alert log so rate-limit bypass is visible
    // in monitoring dashboards even though we still fail-open (to preserve sales
    // during Supabase outages). Investigate any occurrence of this log urgently.
    console.error("[SECURITY ALERT] Rate limit DB error — limits are BYPASSED for key:", key);
    console.error("[SECURITY ALERT] DB error detail:", countError.message);
    return { success: true, remaining: maxRequests };
  }

  const currentCount = count ?? 0;

  // 2. Si excede el límite, rechazar
  if (currentCount >= maxRequests) {
    // Calcular cuándo se libera el primer slot
    const { data: oldest } = await supabaseAdmin
      .from("rate_limit_entries")
      .select("created_at")
      .eq("key", key)
      .gte("created_at", windowStart.toISOString())
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    const oldestTime = oldest
      ? new Date(oldest.created_at).getTime()
      : now.getTime();
    const retryAfter = Math.ceil(
      (oldestTime + windowSeconds * 1000 - now.getTime()) / 1000,
    );

    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(retryAfter, 1),
      message: `Demasiados intentos. Intenta de nuevo en ${Math.max(retryAfter, 1)} segundos.`,
    };
  }

  // 3. Registrar este request
  await supabaseAdmin.from("rate_limit_entries").insert({
    key,
    created_at: now.toISOString(),
  });

  return {
    success: true,
    remaining: maxRequests - currentCount - 1,
    message: `Solicitud permitida (${currentCount + 1}/${maxRequests})`,
  };
}

// ─────────────────────────────────────────────────────────────────
// RATE LIMIT POR IP — 10 intentos cada 15 minutos
// ─────────────────────────────────────────────────────────────────
export async function checkRateLimitByIP(
  ip: string,
): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${ip}`, 10, 15 * 60);
}

// ───────────────────────────────���─────────────────────────────────
// RATE LIMIT POR EMAIL — 5 intentos cada 1 hora
// ─────────────────────────────────────────────────────────────────
export async function checkRateLimitByEmail(
  email: string,
): Promise<RateLimitResult> {
  return checkRateLimit(`email:${email.toLowerCase()}`, 5, 60 * 60);
}

// ─────────────────────────────────────────────────────────────────
// LOG DE INTENTOS FALLIDOS (ahora en Supabase, no en RAM)
// ─────────────────────────────────────────────────────────────────
export async function logFailedAttempt(
  ip: string,
  email: string,
  reason: string,
): Promise<void> {
  try {
    await supabaseAdmin.from("failed_attempts").insert({
      ip,
      email,
      reason,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging failed attempt:", error);
  }
}

// ─────────────────────────────────────────────────────────────────
// LIMPIEZA AUTOMÁTICA (ejecutar vía cron cada hora)
// ─────────────────────────────────────────────────────────────────
export async function cleanupExpiredEntries(): Promise<number> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const { count, error } = await supabaseAdmin
    .from("rate_limit_entries")
    .delete({ count: "exact" })
    .lt("created_at", twoHoursAgo.toISOString());

  if (error) {
    console.error("Cleanup error:", error.message);
    return 0;
  }

  return count ?? 0;
}