import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

export function createSupabaseServerClient(
  request: Request,
  responseHeaders: Headers,
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      async getAll() {
        const cookies = parseCookieHeader(request.headers.get("cookie") ?? "");

        if (!cookies) return null;

        return cookies.map((c) => ({
          name: c.name,
          value: c.value ?? "",
        }));
      },

      async setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, {
              ...options,
              httpOnly: true,
              secure: import.meta.env.PROD,
              // SECURITY FIX: 'strict' prevents auth cookies from being sent on ANY
              // cross-origin navigation, eliminating all remaining CSRF attack vectors.
              // Users following external links will get a clean /login redirect.
              sameSite: "strict",
              path: "/",
            }),
          );
        });
      },
    },
  });
}
