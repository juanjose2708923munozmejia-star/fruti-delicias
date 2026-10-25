import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave SECRETA (ignora las reglas RLS).
 * SOLO se usa en código del servidor (rutas API / acciones del servidor) después de validar los datos.
 * `server-only` hace fallar la compilación si alguien lo importa desde código del navegador.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
