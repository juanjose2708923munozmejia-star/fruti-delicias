import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { bogotaNow } from "@/lib/colombia";
import { formatCOP } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const today = bogotaNow().date;

  const [nuevos, porRevisar, hoy, ventas] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "nuevo"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "comprobante_recibido"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("pickup_date", today).neq("status", "cancelado"),
    supabase.from("orders").select("total").eq("pickup_date", today).neq("status", "cancelado"),
  ]);

  const failed = Boolean(nuevos.error || porRevisar.error || hoy.error || ventas.error);
  const sold = ((ventas.data ?? []) as { total: number }[]).reduce((n, o) => n + o.total, 0);

  return (
    <>
      <h1>Resumen</h1>
      {failed ? (
        <p className="notice" role="alert">
          No se pudieron leer los pedidos. Revisa que hayas ejecutado el archivo <code>03_pedidos_y_pagos.sql</code> en Supabase.
        </p>
      ) : (
        <div className="stat-grid">
          <Link className="stat" href="/admin/pedidos?estado=nuevo"><span>Pedidos nuevos</span><strong>{nuevos.count ?? 0}</strong></Link>
          <Link className="stat" href="/admin/pedidos?pago=comprobante_recibido"><span>Comprobantes por revisar</span><strong>{porRevisar.count ?? 0}</strong></Link>
          <Link className="stat" href="/admin/pedidos?dia=hoy"><span>Pedidos para hoy</span><strong>{hoy.count ?? 0}</strong></Link>
          <div className="stat"><span>Valor de los pedidos de hoy</span><strong>{formatCOP(sold)}</strong></div>
        </div>
      )}
      <div className="info-card">
        <h2 className="h3">Cómo usar el panel</h2>
        <p>
          En <Link href="/admin/pedidos">Pedidos</Link> puedes revisar los comprobantes de Nequi, verificar pagos, asignar la hora de recogida,
          cambiar el estado y avisar al cliente por WhatsApp cuando su pedido esté listo.
        </p>
      </div>
    </>
  );
}
