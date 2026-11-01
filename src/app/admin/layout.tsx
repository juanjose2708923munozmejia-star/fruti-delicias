import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel administrativo", robots: { index: false, follow: false } };

/**
 * Segunda barrera de seguridad (la primera es el middleware): aquí se vuelve a comprobar
 * en el servidor que la persona tiene sesión Y está en la tabla de administradores.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, admin } = await requireAdmin();
  const display = admin.full_name || user.email || "Administrador";
  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="admin-bar-left">
          <strong>Panel administrativo</strong>
          <nav className="admin-nav" aria-label="Panel">
            <Link href="/admin">Resumen</Link>
            <Link href="/admin/pedidos">Pedidos</Link>
            <Link href="/admin/productos">Productos e inventario</Link>
            <Link href="/admin/codigos">Descuentos</Link>
            <Link href="/" target="_blank">Ver la página</Link>
          </nav>
        </div>
        <div className="admin-bar-right">
          <Link href="/admin/cuenta" className="admin-user" title="Mi cuenta">
            {admin.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={admin.avatar_url} alt="" className="avatar" width={36} height={36} />
            ) : (
              <span className="avatar avatar-fallback" aria-hidden="true">{display.slice(0, 1).toUpperCase()}</span>
            )}
            <span className="small">{display}</span>
          </Link>
          <span className="role-badge">Administrador</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost-light btn-sm">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
