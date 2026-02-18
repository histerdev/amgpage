// src/middleware.ts
// Middleware con protección REAL en el servidor
// Lee la sesión desde cookies (no localStorage)

import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from './lib/supabase-ssr';

// Rutas que requieren estar autenticado
const AUTH_ROUTES = ['/perfil', '/pedidos'];

// Rutas que requieren rol de admin
const ADMIN_ROUTES = ['/admin'];

// Rutas de login (redirigen al inicio si ya está autenticado)
const GUEST_ONLY_ROUTES = ['/login', '/registro'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect, request } = context;
  const pathname = url.pathname;

  const isAuthRoute  = AUTH_ROUTES.some(r => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isGuestRoute = GUEST_ONLY_ROUTES.some(r => pathname.startsWith(r));

  // Si es ruta pública, pasar directo
  if (!isAuthRoute && !isAdminRoute && !isGuestRoute) {
    return next();
  }

  // Crear headers de respuesta para escribir cookies actualizadas
  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(request, responseHeaders);

  // ── Leer sesión del servidor (desde cookies) ────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();

  // ── Si ya está logueado, no mostrar login/registro ──────────────────────
  if (isGuestRoute && session) {
    return redirect('/');
  }

  // ── Rutas autenticadas: redirigir si no hay sesión ──────────────────────
  if ((isAuthRoute || isAdminRoute) && !session) {
    return redirect(`/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  // ── Rutas admin: verificar rol en base de datos ─────────────────────────
  if (isAdminRoute && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      // Autenticado pero no admin → página de acceso denegado
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
        { status: 403, headers: { 'Content-Type': 'text/html' } }
      );
    }
  }

  // ── Pasar al siguiente handler, propagando cookies actualizadas ──────────
  const response = await next();

  // Copiar cookies de sesión actualizadas a la respuesta final
  responseHeaders.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append('set-cookie', value);
    }
  });

  return response;
});