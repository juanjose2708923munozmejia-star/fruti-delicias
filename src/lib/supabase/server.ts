import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "./env";

/** Cliente del servidor con la sesión del usuario (cookies). Respeta las reglas de seguridad (RLS). */
export async function createClient() {
  const env = getPublicEnv();
  if (!env) throw new Error("Supabase no está configurado");
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Se ignora cuando se llama desde un Server Component (el middleware refresca la sesión).
        }
      },
    },
  });
}
