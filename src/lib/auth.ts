// src/lib/auth.ts
// Helper de sesión para el CLIENTE (páginas Astro con <script>)
// El middleware ya protege server-side; esto sirve para obtener
// datos del usuario en el cliente sin race conditions.

import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

/**
 * Espera a que Supabase termine de leer la sesión.
 * Resuelve el race condition donde getSession() devuelve null
 * porque el cliente aún no terminó de inicializarse.
 *
 * Nota: Con @supabase/ssr el middleware ya redirige antes de
 * llegar aquí si no hay sesión. Este helper es por si acaso.
 */
export async function waitForSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      sub.unsubscribe();
      resolve(null);
    }, 5000);

    const {
      data: { subscription: sub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeout);
      sub.unsubscribe();
      resolve(session);
    });
  });
}
