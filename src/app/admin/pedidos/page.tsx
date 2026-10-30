import { requireAdmin } from "@/lib/admin-auth";
import { bogotaNow } from "@/lib/colombia";
import { ORDER_STATUSES, PAYMENT_STATUSES, STATUS_LABELS, type OrderStatus, type PaymentMethod, type PaymentStatus } from "@/lib/labels";
import { OrderCard, type OrderView } from "@/components/OrderCard";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  order_number: number;
  status: OrderStatus;
  pickup_date: string;
  pickup_time: string;
  assigned_pickup_time: string | null;
  customer_name: string | null;
  customer_email: string | null;
  notes: string | null;
  total: number;
  created_at: string;
  paid_at: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_receipt_path: string | null;
  review_token: string;
  fulfillment: "recoger" | "domicilio";
  delivery_address: string | null;
  delivery_reference: string | null;
  delivery_maps_url: string | null;
  customers: { phone: string } | { phone: string }[] | null;
  order_items: {
    id: string;
    product_name: string;
    quantity: number;
    line_total: number;
    order_item_toppings: { topping_name: string }[] | null;
  }[] | null;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://fruti-delicias.vercel.app";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pago?: string; dia?: string; q?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const estado = (ORDER_STATUSES as readonly string[]).includes(sp.estado ?? "") ? sp.estado : "";
  const pago = (PAYMENT_STATUSES as readonly string[]).includes(sp.pago ?? "") ? sp.pago : "";
  const dia = sp.dia === "hoy" ? "hoy" : "";
  const q = (sp.q ?? "").trim().slice(0, 60);

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, pickup_date, pickup_time, assigned_pickup_time, customer_name, customer_email, notes, total, created_at, paid_at, payment_method, payment_status, payment_receipt_path, review_token, fulfillment, delivery_address, delivery_reference, delivery_maps_url, customers(phone), order_items(id, product_name, quantity, line_total, order_item_toppings(topping_name))",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (estado) query = query.eq("status", estado);
  if (pago) query = query.eq("payment_status", pago);
  if (dia === "hoy") query = query.eq("pickup_date", bogotaNow().date);
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^#?\d{1,9}$/.test(q.replace(/\s/g, ""))) query = query.eq("order_number", Number(digits));
    else query = query.ilike("customer_name", `%${q.replace(/[%_,()]/g, " ")}%`);
  }
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];

  // Enlaces temporales (1 hora) para ver las capturas de pago, en una sola consulta
  const paths = rows.map((o) => o.payment_receipt_path).filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage.from("receipts").createSignedUrls(paths, 3600);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  const orders: OrderView[] = rows.map((o) => {
    const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers;
    return {
      id: o.id,
      number: o.order_number,
      status: o.status,
      pickupDate: o.pickup_date,
      pickupTime: o.pickup_time.slice(0, 5),
      assignedTime: o.assigned_pickup_time ? o.assigned_pickup_time.slice(0, 5) : null,
      customerName: o.customer_name ?? "Cliente",
      customerEmail: o.customer_email,
      phone: cust?.phone ?? "",
      notes: o.notes,
      total: o.total,
      createdAt: o.created_at,
      paidAt: o.paid_at,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      receiptUrl: o.payment_receipt_path ? urlByPath.get(o.payment_receipt_path) ?? null : null,
      token: o.review_token,
      fulfillment: o.fulfillment,
      address: o.delivery_address,
      reference: o.delivery_reference,
      mapsUrl: o.delivery_maps_url,
      items: (o.order_items ?? []).map((i) => ({
        id: i.id,
        name: i.product_name,
        quantity: i.quantity,
        lineTotal: i.line_total,
        toppings: (i.order_item_toppings ?? []).map((t) => t.topping_name),
      })),
    };
  });

  return (
    <>
      <AutoRefresh seconds={45} />
      <h1>Pedidos</h1>
      <p className="small muted">Los pedidos nuevos aparecen solos cada 45 segundos.</p>

      <form className="filters-bar" method="get">
        <label className="field">
          <span>Buscar</span>
          <input name="q" defaultValue={q} placeholder="N.º de pedido o nombre" />
        </label>
        <label className="field">
          <span>Estado</span>
          <select name="estado" defaultValue={estado}>
            <option value="">Todos</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Pago</span>
          <select name="pago" defaultValue={pago}>
            <option value="">Todos</option>
            <option value="comprobante_recibido">Comprobante por revisar</option>
            <option value="pendiente">Pendiente</option>
            <option value="verificado">Verificado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </label>
        <label className="field">
          <span>Recogida</span>
          <select name="dia" defaultValue={dia}>
            <option value="">Todas las fechas</option>
            <option value="hoy">Solo hoy</option>
          </select>
        </label>
        <div className="filters-actions">
          <button type="submit" className="btn btn-primary btn-sm">Filtrar</button>
          <a className="link-btn" href="/admin/pedidos">Limpiar</a>
        </div>
      </form>

      {error && (
        <p className="notice" role="alert">No se pudieron cargar los pedidos. Intenta recargar la página.</p>
      )}
      {!error && orders.length === 0 && (
        <div className="info-card"><h2 className="h3">No hay pedidos con esos filtros</h2><p>Cuando un cliente haga un pedido aparecerá aquí.</p></div>
      )}

      <div className="order-list">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} siteUrl={SITE} businessName="Fruti Delicias" />
        ))}
      </div>
    </>
  );
}
