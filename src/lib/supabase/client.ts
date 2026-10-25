import { createBrowserClient } from "@supabase/ssr";

/** Cliente del navegador. Solo usa la clave PÚBLICA y sirve para iniciar sesión. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase no está configurado");
  return createBrowserClient(url, anonKey);
}
