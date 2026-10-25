import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel administrativo", robots: { index: false, follow: false } };

/**
 * Segunda barrera de seguridad (la primera es el middleware): aquí se vuelve a comprobar
 * en el servidor que la persona tiene sesión Y está en la tabla de administradores.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!getPublicEnv()) redirect("/acceso?error=config");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: admin } = await sb.from("admins").select("id, full_name").eq("id", user.id).maybeSingle();
  if (!admin) redirect("/acceso?error=sin-permiso");

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <strong>Panel administrativo</strong>
        <div className="admin-bar-right">
          <span className="small">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost-light btn-sm">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
