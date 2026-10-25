import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "./env";

/** Cliente anónimo del servidor, solo para leer el catálogo público. */
export function createPublicClient() {
  const env = getPublicEnv();
  if (!env) return null;
  return createSupabaseClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
