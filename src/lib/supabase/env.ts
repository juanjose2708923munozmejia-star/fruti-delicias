/** Cookie que Supabase pide guardar. Se tipa a mano para que compile con cualquier versión de la librería. */
export type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
