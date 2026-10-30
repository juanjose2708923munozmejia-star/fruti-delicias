"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCOP } from "@/lib/format";
import { formatLongDate, formatTime12, orderNumberLabel } from "@/lib/colombia";

type Tracked = {
  number: number;
  status: "nuevo" | "confirmado" | "en_preparacion" | "listo" | "entregado" | "cancelado";
  pickupDate: string;
  pickupTime: string;
  assignedTime: string | null;
  paymentMethod: "efectivo" | "nequi";
  paymentStatus: "pendiente" | "comprobante_recibido" | "verificado" | "rechazado";
  total: number;
  fulfillment: "recoger" | "domicilio";
};

const STEPS: { id: Tracked["status"]; label: string }[] = [
  { id: "nuevo", label: "Recibido" },
  { id: "confirmado", label: "Confirmado" },
  { id: "en_preparacion", label: "En preparación" },
  { id: "listo", label: "Listo para recoger" },
  { id: "entregado", label: "Entregado" },
];

const HEADLINE: Record<Tracked["status"], string> = {
  nuevo: "Recibimos tu pedido",
  confirmado: "Tu pedido está confirmado",
  en_preparacion: "Estamos preparando tu pedido",
  listo: "¡Tu pedido está listo! Ya puedes pasar a recogerlo",
  entregado: "Pedido entregado. ¡Gracias!",
  cancelado: "Tu pedido fue cancelado",
};

export function TrackingClient({ token, whatsapp }: { token: string; whatsapp: string | null }) {
  const [order, setOrder] = useState<Tracked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifyState, setNotifyState] = useState<"unknown" | "granted" | "denied" | "unsupported">("unknown");
  const lastStatus = useRef<string | null>(null);

  useEffect(() => {
    if (typeof Notification === "undefined") setNotifyState("unsupported");
    else if (Notification.permission === "granted") setNotifyState("granted");
    else if (Notification.permission === "denied") setNotifyState("denied");
  }, []);

  // Consulta el estado cada 15 segundos mientras la página esté abierta.
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch(`/api/seguimiento?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = await res.json();
        if (stop) return;
        if (!res.ok || !json?.ok) {
          setError(json?.error ?? "Lo sentimos, ocurrió un problema. Intenta nuevamente.");
          return;
        }
        const next = json.order as Tracked;
        setError(null);
        setOrder(next);
        if (lastStatus.current && lastStatus.current !== next.status && next.status === "listo") {
          try {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("¡Tu pedido está listo!", { body: `Pedido ${orderNumberLabel(next.number)}: ya puedes pasar a recogerlo.` });
            }
            navigator.vibrate?.(300);
          } catch {
            /* sin notificaciones */
          }
        }
        lastStatus.current = next.status;
      } catch {
        if (!stop) setError("Parece que no tienes conexión a internet. Reintentaremos en unos segundos.");
      }
    }
    load();
    const id = window.setInterval(load, 15000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [token]);

  async function enableNotifications() {
    try {
      const result = await Notification.requestPermission();
      setNotifyState(result === "granted" ? "granted" : "denied");
    } catch {
      setNotifyState("denied");
    }
  }

  if (error && !order) {
    return (
      <section className="checkout-empty">
        <h1>No encontramos tu pedido</h1>
        <p className="notice" role="alert">{error}</p>
        <Link href="/" className="btn btn-primary">Volver al inicio</Link>
      </section>
    );
  }
  if (!order) return <p className="checkout-loading">Buscando tu pedido…</p>;

  const cancelled = order.status === "cancelado";
  const current = STEPS.findIndex((s) => s.id === order.status);
  const hour = order.assignedTime ?? order.pickupTime;
  const delivery = order.fulfillment === "domicilio";
  const wa = whatsapp ? `https://wa.me/57${whatsapp.replace(/\D/g, "").replace(/^57/, "")}?text=${encodeURIComponent(`Hola, consulto por mi pedido ${orderNumberLabel(order.number)}.`)}` : null;

  return (
    <section className="track" aria-live="polite">
      <p className="eyebrow">Pedido {orderNumberLabel(order.number)}</p>
      <h1 className={order.status === "listo" ? "track-ready" : undefined}>{order.status === "listo" && delivery ? "¡Tu pedido está listo! Te lo llevamos a tu dirección" : HEADLINE[order.status]}</h1>

      {!cancelled && (
        <ol className="track-steps" aria-label="Avance del pedido">
          {STEPS.map((s, i) => (
            <li key={s.id} className={i < current ? "done" : i === current ? "now" : ""} aria-current={i === current ? "step" : undefined}>
              <span className="dot" aria-hidden="true" />
              {s.label}
            </li>
          ))}
        </ol>
      )}

      <dl className="confirm-facts">
        <div><dt>{delivery ? "Día de entrega" : "Día de recogida"}</dt><dd>{formatLongDate(order.pickupDate)}</dd></div>
        <div><dt>{order.assignedTime ? "Hora asignada por el equipo" : delivery ? "Hora de entrega" : "Hora de recogida"}</dt><dd>{formatTime12(hour)}</dd></div>
        <div><dt>Total</dt><dd>{formatCOP(order.total)}</dd></div>
        <div>
          <dt>Pago</dt>
          <dd>
            {order.paymentMethod === "efectivo"
              ? order.paymentStatus === "verificado" ? "Pagado en efectivo" : delivery ? "Efectivo al recibir" : "Efectivo al recoger"
              : order.paymentStatus === "verificado" ? "Nequi verificado"
              : order.paymentStatus === "rechazado" ? "Comprobante rechazado: escríbenos"
              : "Nequi en verificación"}
          </dd>
        </div>
      </dl>

      {!cancelled && order.status !== "entregado" && notifyState === "unknown" && (
        <div className="notify-box">
          <p>¿Quieres que te avisemos aquí cuando esté listo? Deja esta página abierta y activa los avisos.</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={enableNotifications}>Activar aviso</button>
        </div>
      )}
      {notifyState === "granted" && order.status !== "entregado" && !cancelled && <p className="small muted">Aviso activado: sonará una notificación cuando tu pedido esté listo.</p>}
      {error && <p className="small muted">{error}</p>}

      <div className="confirm-actions">
        {wa && <a className="btn btn-ghost" href={wa} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>}
        <Link href="/" className="link-btn">Volver al inicio</Link>
      </div>
    </section>
  );
}
