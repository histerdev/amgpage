// src/pages/auth/callback.ts
import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../lib/supabase-ssr";

/**
 * Valida que la redirección sea interna (solo paths relativos).
 * Previene Open Redirect attacks.
 */
function getSafeRedirect(rawRedirect: string | null): string {
  if (!rawRedirect) return "/";

  // Solo permitir paths que empiecen con "/" y NO con "//"
  // "//" es un protocol-relative URL que puede redirigir a otro dominio
  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    return rawRedirect;
  }

  return "/";
}

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = getSafeRedirect(url.searchParams.get("redirectTo"));

  if (code) {
    const responseHeaders = new Headers();
    const supabase = createSupabaseServerClient(request, responseHeaders);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Auth Callback] Error exchanging code:", error.message);
      return redirect("/login?error=oauth_failed");
    }

    // Redirigir con las cookies ya escritas
    return new Response(null, {
      status: 302,
      headers: {
        ...Object.fromEntries(responseHeaders),
        Location: redirectTo,
      },
    });
  }

  return redirect("/login?error=oauth_failed");
};