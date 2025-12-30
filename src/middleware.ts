import { defineMiddleware } from "astro:middleware";
import { supabase } from "./lib/supabase";

export const onRequest = defineMiddleware(async ({ locals, url, redirect, cookies }, next) => {
  
  // 1. SI LA RUTA ES /admin, DEJAMOS QUE LA PÁGINA SE CARGUE
  // La protección la hará el <script> dentro de la página admin
  if (url.pathname.startsWith("/admin")) {
    return next();
  }

  // 2. PARA EL RESTO DE RUTAS (opcional, si quieres proteger otras)
  // Por ahora, simplemente dejamos pasar todo para que no te bloquee
  return next();
});