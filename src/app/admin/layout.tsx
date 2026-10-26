import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel administrativo", robots: { index: false, follow: false } };

/**
 * Segunda barrera de seguridad (la primera es el middleware): aquí se vuelve a comprobar
 * en el servidor que la persona tiene sesión Y está en la tabla de administradores.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="admin-bar-left">
          <strong>Panel administrativo</strong>
          <nav className="admin-nav" aria-label="Panel">
            <Link href="/admin">Resumen</Link>
            <Link href="/admin/pedidos">Pedidos</Link>
            <Link href="/" target="_blank">Ver la página</Link>
          </nav>
        </div>
        <div className="admin-bar-right">
          <span className="role-badge">Administrador</span>
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
