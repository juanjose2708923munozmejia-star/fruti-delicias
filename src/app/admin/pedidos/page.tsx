import { requireAdmin } from "@/lib/admin-auth";
import { bogotaNow, formatShortDate, formatTime12, orderNumberLabel } from "@/lib/colombia";
import { formatCOP } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  STATUS_LABELS,
  paymentLabel,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/labels";
import { assignPickupTime, setPayment, updateOrderStatus } from "./actions";

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
  subtotal: number;
  discount: number;
  total: number;
  created_at: string;
  paid_at: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_receipt_path: string | null;
  review_token: string;
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

function stamp(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

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
      "id, order_number, status, pickup_date, pickup_time, assigned_pickup_time, customer_name, customer_email, notes, subtotal, discount, total, created_at, paid_at, payment_method, payment_status, payment_receipt_path, review_token, customers(phone), order_items(id, product_name, quantity, line_total, order_item_toppings(topping_name))",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (estado) query = query.eq("status", estado);
  if (pago) query = query.eq("payment_status", pago);
  if (dia === "hoy") query = query.eq("pickup_date", bogotaNow().date);
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (/^#?\d{1,9}$/.test(q.replace(/\s/g, ""))) query = query.eq("order_number", Number(digits));
    else query = query.ilike("customer_name", `%${q.replace(/[%_,()]/g, " ")}%`);
  }
  const { data, error } = await query;
  const orders = (data ?? []) as unknown as Row[];

  // Enlaces temporales (1 hora) para ver las capturas de pago
  const paths = orders.map((o) => o.payment_receipt_path).filter((p): p is string => Boolean(p));
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage.from("receipts").createSignedUrls(paths, 3600);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }

  return (
    <>
      <h1>Pedidos</h1>

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
        <p className="notice" role="alert">
          No se pudieron cargar los pedidos. Revisa que hayas ejecutado <code>03_pedidos_y_pagos.sql</code> en Supabase.
        </p>
      )}
      {!error && orders.length === 0 && (
        <div className="info-card"><h2 className="h3">No hay pedidos con esos filtros</h2><p>Cuando un cliente haga un pedido aparecerá aquí.</p></div>
      )}

      <div className="order-list">
        {orders.map((o) => {
          const cust = Array.isArray(o.customers) ? o.customers[0] : o.customers;
          const phone = cust?.phone ?? "";
          const receiptUrl = o.payment_receipt_path ? urlByPath.get(o.payment_receipt_path) : undefined;
          const hour = o.assigned_pickup_time ? o.assigned_pickup_time.slice(0, 5) : null;
          const msg = encodeURIComponent(
            `Hola ${o.customer_name ?? ""}, tu pedido ${orderNumberLabel(o.order_number)} de Fruti Delicias ya está listo. Puedes pasar a recogerlo${hour ? ` a las ${formatTime12(hour)}` : ""}. Detalle: ${SITE}/seguimiento/${o.review_token}`,
          );
          return (
            <article key={o.id} className="order-card">
              <header className="order-head">
                <div>
                  <p className="order-no">{orderNumberLabel(o.order_number)}</p>
                  <h2 className="h3">{o.customer_name ?? "Cliente"}</h2>
                  <p className="small muted">Pedido hecho el {stamp(o.created_at)}</p>
                </div>
                <div className="order-badges">
                  <span className={`badge st-${o.status}`}>{STATUS_LABELS[o.status]}</span>
                  <span className={`badge pay-${o.payment_status}`}>{paymentLabel(o.payment_method, o.payment_status)}</span>
                </div>
              </header>

              <dl className="order-meta">
                <div><dt>Recogida pedida</dt><dd>{formatShortDate(o.pickup_date)}, {formatTime12(o.pickup_time.slice(0, 5))}</dd></div>
                <div><dt>Hora asignada</dt><dd>{hour ? formatTime12(hour) : "Sin asignar"}</dd></div>
                <div><dt>Forma de pago</dt><dd>{o.payment_method === "nequi" ? "Nequi" : "Efectivo"}</dd></div>
                <div><dt>Hora de pago</dt><dd>{o.paid_at ? stamp(o.paid_at) : "-----"}</dd></div>
                <div><dt>Celular</dt><dd>{phone ? formatPhone(phone) : "—"}</dd></div>
                {o.customer_email && <div><dt>Correo</dt><dd>{o.customer_email}</dd></div>}
              </dl>

              <ul className="order-items">
                {(o.order_items ?? []).map((i) => (
                  <li key={i.id}>
                    <span>
                      {i.quantity} × {i.product_name}
                      {(i.order_item_toppings ?? []).length > 0 && <small>{(i.order_item_toppings ?? []).map((t) => t.topping_name).join(", ")}</small>}
                    </span>
                    <strong>{formatCOP(i.line_total)}</strong>
                  </li>
                ))}
                <li className="order-total"><span>Total</span><strong>{formatCOP(o.total)}</strong></li>
              </ul>
              {o.notes && <p className="order-notes"><strong>Observaciones:</strong> {o.notes}</p>}

              {o.payment_method === "nequi" && (
                <div className="receipt-admin">
                  <strong>Comprobante de Nequi</strong>
                  {receiptUrl ? (
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="receipt-thumb-link">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={receiptUrl} alt={`Comprobante del pedido ${orderNumberLabel(o.order_number)}`} className="receipt-thumb" loading="lazy" />
                      <span>Abrir en grande</span>
                    </a>
                  ) : (
                    <p className="muted small">El cliente no subió captura.</p>
                  )}
                </div>
              )}

              <div className="order-actions">
                <form action={setPayment} className="inline-form">
                  <input type="hidden" name="id" value={o.id} />
                  <span className="inline-label">Pago:</span>
                  {o.payment_status !== "verificado" && (
                    <button type="submit" name="decision" value="verificado" className="btn btn-primary btn-sm">
                      {o.payment_method === "nequi" ? "Verificar pago" : "Marcar como pagado"}
                    </button>
                  )}
                  {o.payment_method === "nequi" && o.payment_status !== "rechazado" && (
                    <button type="submit" name="decision" value="rechazado" className="btn btn-ghost btn-sm">Rechazar comprobante</button>
                  )}
                  {(o.payment_status === "verificado" || o.payment_status === "rechazado") && (
                    <button type="submit" name="decision" value="pendiente" className="link-btn">Deshacer</button>
                  )}
                </form>

                <form action={assignPickupTime} className="inline-form">
                  <input type="hidden" name="id" value={o.id} />
                  <label className="inline-label" htmlFor={`t-${o.id}`}>Hora de recogida:</label>
                  <input id={`t-${o.id}`} type="time" name="time" defaultValue={hour ?? ""} className="time-input" />
                  <button type="submit" className="btn btn-ghost btn-sm">Guardar hora</button>
                </form>

                <form action={updateOrderStatus} className="inline-form">
                  <input type="hidden" name="id" value={o.id} />
                  <label className="inline-label" htmlFor={`s-${o.id}`}>Estado:</label>
                  <select id={`s-${o.id}`} name="status" defaultValue={o.status}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-ghost btn-sm">Guardar estado</button>
                </form>

                <div className="inline-form">
                  {o.status !== "listo" && o.status !== "entregado" && o.status !== "cancelado" && (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value="listo" />
                      <button type="submit" className="btn btn-primary btn-sm">Ya está listo, que pase</button>
                    </form>
                  )}
                  {phone && (
                    <a className="btn btn-ghost btn-sm" href={`https://wa.me/57${phone}?text=${msg}`} target="_blank" rel="noopener noreferrer">
                      Avisar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
