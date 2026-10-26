import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/supabase/env";

/**
 * Verifica EN EL SERVIDOR que hay sesión y que la persona es administradora.
 * Debe llamarse en cada página del panel y en cada acción (las acciones del servidor son públicas por naturaleza).
 */
export async function requireAdmin() {
  if (!getPublicEnv()) redirect("/acceso?error=config");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data: admin } = await supabase.from("admins").select("id").eq("id", user.id).maybeSingle();
  if (!admin) redirect("/acceso?error=sin-permiso");
  return { supabase, user };
}
