import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/supabase/env";

export type AdminProfile = { id: string; full_name: string | null; avatar_url: string | null; phone: string | null };

/**
 * Verifica EN EL SERVIDOR que hay sesión y que la persona es administradora.
 * `cache` evita repetir la comprobación dentro de una misma carga de página (el layout y la página la usan).
 * Debe llamarse también en cada acción: las acciones del servidor son públicas por naturaleza.
 */
export const requireAdmin = cache(async () => {
  if (!getPublicEnv()) redirect("/acceso?error=config");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data } = await supabase.from("admins").select("id, full_name, avatar_url, phone").eq("id", user.id).maybeSingle();
  if (!data) redirect("/acceso?error=sin-permiso");
  return { supabase, user, admin: data as AdminProfile };
});
