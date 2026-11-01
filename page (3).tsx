import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { bogotaNow } from "@/lib/colombia";
import { formatCOP } from "@/lib/format";
import { QuickSettings } from "@/components/QuickSettings";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const today = bogotaNow().date;

  const [flagsRes, nuevos, porRevisar, hoy, ventas] = await Promise.all([
    supabase.from("settings").select("orders_enabled, topping_roulette_enabled, cash_enabled, nequi_enabled").eq("id", 1).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "nuevo"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "comprobante_recibido"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("pickup_date", today).neq("status", "cancelado"),
    supabase.from("orders").select("total").eq("pickup_date", today).neq("status", "cancelado"),
  ]);

  const flags = flagsRes.data as { orders_enabled: boolean; topping_roulette_enabled: boolean; cash_enabled: boolean; nequi_enabled: boolean } | null;
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
      {flags && <QuickSettings initial={flags} />}
      <div className="info-card">
        <h2 className="h3">Cómo usar el panel</h2>
        <p>
          En <Link href="/admin/pedidos">Pedidos</Link> revisas comprobantes, verificas pagos y avisas por WhatsApp. En <Link href="/admin/productos">Productos e inventario</Link> agregas
          productos y toppings, cambias precios y controlas cuánto queda de cada uno. En <Link href="/admin/codigos">Descuentos</Link> creas códigos como JL50.
        </p>
      </div>
    </>
  );
}
