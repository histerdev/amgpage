import { createServerClient, serializeCookieHeader, parseCookieHeader } from '@supabase/ssr';

const SUPABASE_URL = "https://nefkzzaqzmzkpoqfyfoj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_52tXyRZC2r-cqIta2zG1aA_pI-ypVtH";
function createSupabaseServerClient(request, responseHeaders) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      async getAll() {
        const cookies = parseCookieHeader(request.headers.get("cookie") ?? "");
        if (!cookies) return null;
        return cookies.map((c) => ({
          name: c.name,
          value: c.value ?? ""
        }));
      },
      async setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              secure: true,
              sameSite: "lax",
              path: "/"
            })
          );
        });
      }
    }
  });
}

export { createSupabaseServerClient as c };
