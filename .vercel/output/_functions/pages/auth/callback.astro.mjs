import { c as createSupabaseServerClient } from '../../chunks/supabase-ssr_BVpRlrVg.mjs';
export { renderers } from '../../renderers.mjs';

function getSafeRedirect(rawRedirect) {
  if (!rawRedirect) return "/";
  if (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) {
    return rawRedirect;
  }
  return "/";
}
const prerender = false;
const GET = async ({ request, redirect }) => {
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
    return new Response(null, {
      status: 302,
      headers: {
        ...Object.fromEntries(responseHeaders),
        Location: redirectTo
      }
    });
  }
  return redirect("/login?error=oauth_failed");
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
