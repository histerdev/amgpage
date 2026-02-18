// src/pages/auth/callback.ts
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-ssr';

export const GET: APIRoute = async ({ request, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectTo = url.searchParams.get('redirectTo') || '/';

  if (code) {
    const responseHeaders = new Headers();
    const supabase = createSupabaseServerClient(request, responseHeaders);

    // Intercambia el code por una sesión → escribe las cookies
    await supabase.auth.exchangeCodeForSession(code);

    // Redirigir con las cookies ya escritas
    return new Response(null, {
      status: 302,
      headers: {
        ...Object.fromEntries(responseHeaders),
        Location: redirectTo,
      },
    });
  }

  return redirect('/login?error=oauth_failed');
};