"use client";

import { useState } from "react";
import { formatCOP } from "@/lib/format";
import { formatLongDate, formatShortDate, formatTime12, orderNumberLabel } from "@/lib/colombia";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  paymentLabel,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";
import { assignPickupTime, deleteOrder, editOrder, setPayment, updateOrderStatus } from "@/app/admin/pedidos/actions";

export type OrderView = {
  id: string;
  number: number;
  status: OrderStatus;
  pickupDate: string;
  pickupTime: string;
  assignedTime: string | null;
  customerName: string;
  customerEmail: string | null;
  phone: string;
  notes: string | null;
  total: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receiptUrl: string | null;
  token: string;
  items: { id: string; name: string; quantity: number; lineTotal: number; toppings: string[] }[];
};

const REASONS = [
  "el valor pagado no coincide con el total del pedido",
  "la captura no se ve clara o está incompleta",
  "no encontramos ese pago en nuestra cuenta",
  "el comprobante parece falso o alterado",
  "otro motivo",
];

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

type Panel = null | "reject" | "edit" | "delete";

export function OrderCard({ order, siteUrl, businessName }: { order: OrderView; siteUrl: string; businessName: string }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [pay, setPay] = useState<PaymentStatus>(order.paymentStatus);
  const [paidAt, setPaidAt] = useState<string | null>(order.paidAt);
  const [assigned, setAssigned] = useState<string | null>(order.assignedTime);
  const [timeInput, setTimeInput] = useState(order.assignedTime ?? "");
  const [info, setInfo] = useState({ name: order.customerName, notes: order.notes ?? "", date: order.pickupDate, time: order.pickupTime });
  const [form, setForm] = useState(info);
  const [panel, setPanel] = useState<Panel>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [gone, setGone] = useState(false);

  if (gone) return null;

  const num = orderNumberLabel(order.number);
  const first = info.name.split(" ")[0] || "cliente";
  const trackLink = `${siteUrl}/seguimiento/${order.token}`;
  const hour = assigned ?? null;

  const msgConfirm = `Hola ${first}, te escribimos de ${businessName}. ¿Confirmas tu pedido ${num} para el ${formatLongDate(info.date)} a las ${formatTime12(info.time)}? Respóndenos "SÍ" para dejarlo confirmado.`;
  const msgReady = `Hola ${first}, tu pedido ${num} de ${businessName} ya está listo. Puedes pasar a recogerlo${hour ? ` a las ${formatTime12(hour)}` : ""}. Seguimiento: ${trackLink}`;
  const msgReject = `Hola ${first}, revisamos el comprobante de Nequi de tu pedido ${num} y fue rechazado: ${reason}.${extra.trim() ? ` ${extra.trim()}.` : ""} Si ya pagaste, envíanos por aquí una captura clara del pago; si prefieres, puedes pagar en efectivo al recoger. Seguimiento: ${trackLink}`;

  async function run(label: string, fn: () => Promise<ActionResult>, okText: string, rollback?: () => void, onOk?: () => void) {
    setBusy(label);
    setNote(null);
    try {
      const r = await fn();
      if (r.ok) {
        onOk?.();
        setNote({ kind: "ok", text: okText });
      } else {
        rollback?.();
        setNote({ kind: "error", text: r.error });
      }
    } catch {
      rollback?.();
      setNote({ kind: "error", text: "No hubo respuesta. Revisa tu conexión o vuelve a iniciar sesión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  function changeStatus(next: OrderStatus, okText = "Estado guardado") {
    const prev = status;
    setStatus(next);
    return run("estado", () => updateOrderStatus(order.id, next), okText, () => setStatus(prev));
  }

  function markReadyAndNotify() {
    // El enlace de WhatsApp se abre en el mismo clic para que el navegador no lo bloquee.
    window.open(whatsappUrl(order.phone, msgReady), "_blank", "noopener");
    return changeStatus("listo", "Marcado como listo. Se abrió WhatsApp para avisarle.");
  }

  function saveTime() {
    const prev = assigned;
    setAssigned(timeInput || null);
    return run("hora", () => assignPickupTime(order.id, timeInput), "Hora de recogida guardada", () => setAssigned(prev));
  }

  function verifyPayment() {
    const prev = { pay, paidAt, status };
    setPay("verificado");
    setPaidAt(new Date().toISOString());
    if (status === "nuevo") setStatus("confirmado");
    return run("pago", () => setPayment(order.id, "verificado"), "Pago verificado", () => {
      setPay(prev.pay);
      setPaidAt(prev.paidAt);
      setStatus(prev.status);
    });
  }

  function undoPayment() {
    const prev = { pay, paidAt };
    setPay("pendiente");
    setPaidAt(null);
    return run("pago", () => setPayment(order.id, "pendiente"), "Pago devuelto a pendiente", () => {
      setPay(prev.pay);
      setPaidAt(prev.paidAt);
    });
  }

  function rejectAndNotify() {
    window.open(whatsappUrl(order.phone, msgReject), "_blank", "noopener");
    const prev = { pay, paidAt };
    setPay("rechazado");
    setPaidAt(null);
    setPanel(null);
    return run("pago", () => setPayment(order.id, "rechazado"), "Comprobante rechazado. Se abrió WhatsApp con el mensaje.", () => {
      setPay(prev.pay);
      setPaidAt(prev.paidAt);
    });
  }

  function saveEdit() {
    const prev = info;
    setInfo(form);
    return run(
      "editar",
      () => editOrder(order.id, { name: form.name, notes: form.notes, pickupDate: form.date, pickupTime: form.time }),
      "Pedido actualizado",
      () => setInfo(prev),
      () => setPanel(null),
    );
  }

  function remove() {
    return run("borrar", () => deleteOrder(order.id), "Pedido eliminado", undefined, () => setGone(true));
  }

  const isBusy = busy !== null;
  const canNotifyReady = status !== "listo" && status !== "entregado" && status !== "cancelado";

  return (
    <article className="order-card" data-panel-open={panel !== null ? "true" : "false"} aria-busy={isBusy}>
      <header className="order-head">
        <div>
          <p className="order-no">{num}</p>
          <h2 className="h3">{info.name}</h2>
          <p className="small muted">Pedido hecho el {stamp(order.createdAt)}</p>
        </div>
        <div className="order-head-right">
          <div className="order-badges">
            <span className={`badge st-${status}`}>{STATUS_LABELS[status]}</span>
            <span className={`badge pay-${pay}`}>{paymentLabel(order.paymentMethod, pay)}</span>
          </div>
          <div className="order-tools">
            <button type="button" className="icon-btn" aria-label={`Editar el pedido ${num}`} title="Editar" onClick={() => { setForm(info); setPanel(panel === "edit" ? null : "edit"); }}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>
            <button type="button" className="icon-btn icon-danger" aria-label={`Eliminar el pedido ${num}`} title="Eliminar" onClick={() => setPanel(panel === "delete" ? null : "delete")}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></svg>
            </button>
          </div>
        </div>
      </header>

      <dl className="order-meta">
        <div><dt>Recogida pedida</dt><dd>{formatShortDate(info.date)}, {formatTime12(info.time)}</dd></div>
        <div><dt>Hora asignada</dt><dd>{hour ? formatTime12(hour) : "Sin asignar"}</dd></div>
        <div><dt>Forma de pago</dt><dd>{order.paymentMethod === "nequi" ? "Nequi" : "Efectivo"}</dd></div>
        <div><dt>Hora de pago</dt><dd>{paidAt ? stamp(paidAt) : "-----"}</dd></div>
        <div><dt>Celular</dt><dd>{formatPhone(order.phone)}</dd></div>
        {order.customerEmail && <div><dt>Correo</dt><dd>{order.customerEmail}</dd></div>}
      </dl>

      <ul className="order-items">
        {order.items.map((i) => (
          <li key={i.id}>
            <span>{i.quantity} × {i.name}{i.toppings.length > 0 && <small>{i.toppings.join(", ")}</small>}</span>
            <strong>{formatCOP(i.lineTotal)}</strong>
          </li>
        ))}
        <li className="order-total"><span>Total</span><strong>{formatCOP(order.total)}</strong></li>
      </ul>
      {info.notes && <p className="order-notes"><strong>Observaciones:</strong> {info.notes}</p>}

      {order.paymentMethod === "nequi" && (
        <div className="receipt-admin">
          <strong>Comprobante de Nequi</strong>
          {order.receiptUrl ? (
            <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer" className="receipt-thumb-link">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.receiptUrl} alt={`Comprobante del pedido ${num}`} className="receipt-thumb" loading="lazy" />
              <span>Abrir en grande</span>
            </a>
          ) : (
            <p className="muted small">El cliente no subió captura.</p>
          )}
        </div>
      )}

      {panel === "reject" && (
        <div className="order-panel" role="group" aria-label="Rechazar comprobante">
          <strong>¿Por qué se rechaza el comprobante?</strong>
          <label className="field">
            <span className="sr-only">Motivo</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Detalle para el cliente <span className="optional">(opcional)</span></span>
            <input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={160} />
          </label>
          <p className="small muted">Mensaje que se enviará: “{msgReject}”</p>
          <div className="inline-form">
            <button type="button" className="btn btn-primary btn-sm" onClick={rejectAndNotify} disabled={isBusy}>Rechazar y avisar por WhatsApp</button>
            <button type="button" className="link-btn" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {panel === "edit" && (
        <div className="order-panel" role="group" aria-label="Editar pedido">
          <strong>Editar pedido {num}</strong>
          <label className="field"><span>Nombre del cliente</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} /></label>
          <div className="two-cols">
            <label className="field"><span>Día de recogida</span><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="field"><span>Hora de recogida</span><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
          </div>
          <label className="field"><span>Observaciones</span><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} /></label>
          <div className="inline-form">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit} disabled={isBusy}>{busy === "editar" ? "Guardando…" : "Guardar cambios"}</button>
            <button type="button" className="link-btn" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {panel === "delete" && (
        <div className="order-panel order-panel-danger" role="alertdialog" aria-label="Confirmar eliminación">
          <strong>¿Eliminar el pedido {num} de {info.name}?</strong>
          <p className="small">Se borra para siempre, con su comprobante. No se puede deshacer.</p>
          <div className="inline-form">
            <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={isBusy}>{busy === "borrar" ? "Eliminando…" : "Sí, eliminar"}</button>
            <button type="button" className="link-btn" onClick={() => setPanel(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="order-actions">
        <div className="inline-form">
          <span className="inline-label">Pago:</span>
          {pay !== "verificado" && (
            <button type="button" className="btn btn-primary btn-sm" onClick={verifyPayment} disabled={isBusy}>
              {busy === "pago" ? "Guardando…" : order.paymentMethod === "nequi" ? "Verificar pago" : "Marcar como pagado"}
            </button>
          )}
          {order.paymentMethod === "nequi" && pay !== "rechazado" && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPanel(panel === "reject" ? null : "reject")} disabled={isBusy}>Rechazar comprobante</button>
          )}
          {(pay === "verificado" || pay === "rechazado") && (
            <button type="button" className="link-btn" onClick={undoPayment} disabled={isBusy}>Deshacer</button>
          )}
        </div>

        <div className="inline-form">
          <label className="inline-label" htmlFor={`t-${order.id}`}>Hora de recogida:</label>
          <input id={`t-${order.id}`} type="time" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} className="time-input" />
          <button type="button" className="btn btn-ghost btn-sm" onClick={saveTime} disabled={isBusy}>{busy === "hora" ? "Guardando…" : "Guardar hora"}</button>
        </div>

        <div className="inline-form">
          <label className="inline-label" htmlFor={`s-${order.id}`}>Estado:</label>
          <select id={`s-${order.id}`} value={status} onChange={(e) => changeStatus(e.target.value as OrderStatus)} disabled={isBusy}>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <span className="small muted">{busy === "estado" ? "Guardando…" : "Se guarda al elegir"}</span>
        </div>

        <div className="inline-form">
          {canNotifyReady && (
            <button type="button" className="btn btn-primary btn-sm" onClick={markReadyAndNotify} disabled={isBusy}>Ya está listo, que pase (avisar por WhatsApp)</button>
          )}
          <a className="btn btn-ghost btn-sm" href={whatsappUrl(order.phone, msgConfirm)} target="_blank" rel="noopener noreferrer">Confirmar con el cliente por WhatsApp</a>
          {status === "listo" && (
            <a className="btn btn-ghost btn-sm" href={whatsappUrl(order.phone, msgReady)} target="_blank" rel="noopener noreferrer">Volver a avisar: ya está listo</a>
          )}
        </div>

        <p className={`order-note${note ? ` ${note.kind}` : ""}`} role="status" aria-live="polite">{note?.text ?? ""}</p>
      </div>
    </article>
  );
}
