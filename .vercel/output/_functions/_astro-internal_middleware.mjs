import { d as defineMiddleware, s as sequence } from './chunks/index_Dn32cHqG.mjs';
import { c as createSupabaseServerClient } from './chunks/supabase-ssr_BVpRlrVg.mjs';
import 'es-module-lexer';
import './chunks/astro-designed-error-pages_BWjy1Zri.mjs';
import 'piccolore';
import './chunks/astro/server_C0Nqi1mF.mjs';
import 'clsx';

const AUTH_ROUTES = ["/perfil", "/pedidos"];
const ADMIN_ROUTES = ["/admin"];
const GUEST_ONLY_ROUTES = ["/login", "/registro"];
const onRequest$1 = defineMiddleware(async (context, next) => {
  const { url, redirect, request } = context;
  const pathname = url.pathname;
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isGuestRoute = GUEST_ONLY_ROUTES.some((r) => pathname.startsWith(r));
  if (!isAuthRoute && !isAdminRoute && !isGuestRoute) {
    return next();
  }
  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(request, responseHeaders);
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user && !userError;
  if (isGuestRoute && isAuthenticated) {
    return redirect("/");
  }
  if ((isAuthRoute || isAdminRoute) && !isAuthenticated) {
    return redirect(`/login?redirectTo=${encodeURIComponent(pathname)}`);
  }
  if (isAdminRoute && isAuthenticated) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return new Response(
        `<!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><title>Acceso Denegado</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; 
                 justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff; }
          .box { text-align: center; }
          h1 { font-size: 4rem; margin: 0; }
          p { color: #666; }
          a { color: #2ecc71; text-decoration: none; font-weight: bold; }
        </style>
        </head>
        <body>
          <div class="box">
            <h1>🚫</h1>
            <h2>ACCESO DENEGADO</h2>
            <p>No tienes permisos de administrador.</p>
            <a href="/">← Volver al inicio</a>
          </div>
        </body>
        </html>`,
        { status: 403, headers: { "Content-Type": "text/html" } }
      );
    }
  }
  const response = await next();
  responseHeaders.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      response.headers.append("set-cookie", value);
    }
  });
  return response;
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
