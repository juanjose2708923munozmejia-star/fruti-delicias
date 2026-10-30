"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatCOP } from "@/lib/format";
import { formatLongDate, formatShortDate, formatTime12, orderNumberLabel } from "@/lib/colombia";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { lineUnit, useCart } from "./CartProvider";
import { Logo } from "./Logo";

type Slot = { time: string; remaining: number };
type Day = { date: string; slots: Slot[] };
type Config = {
  ordersEnabled: boolean;
  cashEnabled: boolean;
  nequiEnabled: boolean;
  nequiNumber: string | null;
  nequiHolder: string | null;
  maxItems: number;
  pickupInstructions: string | null;
  address: string | null;
  businessName: string;
  whatsapp: string | null;
};
type Method = "efectivo" | "nequi";
type Confirmed = {
  number: number;
  token: string;
  customerName: string | null;
  pickupDate: string;
  pickupTime: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: Method;
  paymentStatus: string;
  createdAt: string;
  fulfillment: "recoger" | "domicilio";
  address: string | null;
  reference: string | null;
  items: { name: string; quantity: number; unitPrice: number; lineTotal: number; toppings: string[] }[];
};

const GENERIC = "Lo sentimos, ocurrió un problema. Intenta nuevamente.";
const STORAGE_LAST = "bp-last-order-v1";

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k${Date.now()}${Math.random().toString(16).slice(2)}`;
}

/** Reduce la captura (máx. 1600 px, JPG) para que suba rápido incluso con datos móviles. */
async function prepareReceipt(file: File): Promise<File> {
  const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("blob");
    return new File([blob], "comprobante.jpg", { type: "image/jpeg" });
  } catch {
    if (okType && file.size <= 3.5 * 1024 * 1024) return file;
    throw new Error("No pudimos leer esa imagen. Sube una captura en formato JPG o PNG.");
  }
}

function formatStamp(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function CheckoutClient({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  const { items, hydrated, subtotal, discount, total, clear, openCart } = useCart();

  const [config, setConfig] = useState<Config | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [fulfillment, setFulfillment] = useState<"recoger" | "domicilio">("recoger");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [locating, setLocating] = useState(false);
  const [method, setMethod] = useState<Method>("efectivo");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [website, setWebsite] = useState(""); // campo trampa
  const [copied, setCopied] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const keyRef = useRef<string>("");

  // Cargar formas de pago y horarios disponibles
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pedido-config", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json?.ok) throw new Error("config");
        const cfg = json.config as Config;
        setConfig(cfg);
        setDays(json.dates as Day[]);
        setMethod(cfg.cashEnabled ? "efectivo" : "nequi");
      } catch {
        if (!cancelled) setLoadError("No pudimos cargar los horarios en este momento. Intenta nuevamente en unos minutos.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Recuperar el último recibo si la persona recarga la página (solo si no hay un pedido nuevo en curso)
  useEffect(() => {
    if (!hydrated) return;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_LAST);
      if (saved && items.length === 0) setConfirmed(JSON.parse(saved) as Confirmed);
      if (items.length > 0) window.sessionStorage.removeItem(STORAGE_LAST);
    } catch {
      /* sin recibo guardado */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Vista previa de la captura
  useEffect(() => {
    if (!receipt) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  const slots = useMemo(() => days.find((d) => d.date === date)?.slots ?? [], [days, date]);

  // Una llave nueva cada vez que cambian los datos; si se reintenta igual, no se duplica el pedido.
  const signature = JSON.stringify([items.map((i) => [i.key, i.quantity]), name, phone, email, date, time, notes, method, receipt?.name, receipt?.size, fulfillment, address, reference, mapsUrl]);
  useEffect(() => {
    keyRef.current = newKey();
  }, [signature]);

  function fail(message: string) {
    setError(message);
    setBusy(false);
    window.setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function onPickReceipt(file: File | null) {
    setError(null);
    if (!file) return setReceipt(null);
    if (!file.type.startsWith("image/")) {
      setReceipt(null);
      return fail("El comprobante debe ser una imagen (captura de pantalla).");
    }
    try {
      setReceipt(await prepareReceipt(file));
    } catch (e) {
      setReceipt(null);
      fail(e instanceof Error ? e.message : GENERIC);
    }
  }

  /** Toma la ubicación actual del celular y la convierte en un enlace de Google Maps. */
  function shareMyLocation() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return fail("Tu celular no permite compartir la ubicación desde aquí. Pega el enlace de Google Maps o escribe la dirección.");
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setMapsUrl(`https://www.google.com/maps?q=${lat},${lng}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
        fail("No pudimos tomar tu ubicación. Revisa el permiso del navegador o pega el enlace de Google Maps.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function copyNumber() {
    if (!config?.nequiNumber) return;
    try {
      await navigator.clipboard.writeText(config.nequiNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* el número queda visible para copiarlo a mano */
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (items.length === 0) return fail("Tu pedido está vacío. Agrega productos desde el menú.");
    if (name.trim().length < 2) return fail("Escribe tu nombre completo.");
    if (!normalizePhone(phone)) return fail("Escribe un celular colombiano válido de 10 dígitos (empieza por 3).");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return fail("Revisa tu correo electrónico: no parece válido.");
    if (fulfillment === "domicilio" && address.trim().length < 8) return fail("Escribe la dirección completa para el domicilio (barrio, calle o carrera y número).");
    if (mapsUrl.trim() && !/^https:\/\//i.test(mapsUrl.trim())) return fail("El enlace de Google Maps debe empezar por https://");
    if (!date || !time) return fail(fulfillment === "domicilio" ? "Elige el día y la hora en que quieres recibir tu pedido." : "Elige el día y la hora en que vas a recoger tu pedido.");
    if (method === "nequi" && !receipt) return fail("Sube la captura de tu pago por Nequi para poder verificarlo.");

    setBusy(true);
    try {
      const form = new FormData();
      form.set(
        "data",
        JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, toppingIds: i.toppings.map((t) => t.id) })),
          name,
          phone,
          email,
          pickupDate: date,
          pickupTime: time,
          notes,
          fulfillment,
          address,
          reference,
          mapsUrl,
          paymentMethod: method,
          idempotencyKey: keyRef.current || newKey(),
          website,
        }),
      );
      if (method === "nequi" && receipt) form.set("receipt", receipt);
      const res = await fetch("/api/pedidos", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        // Si el horario se llenó, se actualiza la lista para que elija otro.
        if (res.status === 409) {
          fetch("/api/pedido-config", { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => j?.ok && setDays(j.dates as Day[]))
            .catch(() => undefined);
          setTime("");
        }
        return fail(json?.error ?? GENERIC);
      }
      const order = json.order as Confirmed;
      try {
        window.sessionStorage.setItem(STORAGE_LAST, JSON.stringify(order));
      } catch {
        /* sin almacenamiento */
      }
      clear();
      setConfirmed(order);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      fail(typeof navigator !== "undefined" && navigator.onLine === false ? "Parece que no tienes conexión a internet. Revísala e intenta de nuevo." : GENERIC);
    }
  }

  // ---------------- Pantalla: pedido recibido + recibo virtual ----------------
  if (confirmed) {
    const trackUrl = typeof window !== "undefined" ? `${window.location.origin}/seguimiento/${confirmed.token}` : `/seguimiento/${confirmed.token}`;
    const waText = encodeURIComponent(`Hola, hice el pedido ${orderNumberLabel(confirmed.number)} en ${businessName}.`);
    const wa = config?.whatsapp ? `https://wa.me/57${config.whatsapp.replace(/\D/g, "").replace(/^57/, "")}?text=${waText}` : null;
    return (
      <div className="confirm">
        <section className="confirm-card" aria-labelledby="confirm-title">
          <p className="eyebrow">Gracias por tu pedido</p>
          <h1 id="confirm-title">¡Pedido recibido!</h1>
          <p className="confirm-number">{orderNumberLabel(confirmed.number)}</p>
          <dl className="confirm-facts">
            <div><dt>{confirmed.fulfillment === "domicilio" ? "Día de entrega" : "Día de recogida"}</dt><dd>{formatLongDate(confirmed.pickupDate)}</dd></div>
            <div><dt>{confirmed.fulfillment === "domicilio" ? "Hora de entrega" : "Hora de recogida"}</dt><dd>{formatTime12(confirmed.pickupTime)}</dd></div>
            <div><dt>Total</dt><dd>{formatCOP(confirmed.total)}</dd></div>
          </dl>
          <div className="confirm-steps">
            <h2 className="h3">{confirmed.fulfillment === "domicilio" ? "Cómo recibirás tu pedido" : "Cómo recoger tu pedido"}</h2>
            <ul>
              {confirmed.fulfillment === "domicilio" ? (
                <>
                  <li>Lo llevaremos a: {confirmed.address}{confirmed.reference ? ` (${confirmed.reference})` : ""}.</li>
                  <li>Ten a la mano tu número de pedido {orderNumberLabel(confirmed.number)}.</li>
                </>
              ) : (
                <>
                  <li>Preséntate con tu número de pedido {orderNumberLabel(confirmed.number)}.</li>
                  {config?.address && <li>Lugar: {config.address}.</li>}
                  {config?.pickupInstructions && <li>{config.pickupInstructions}</li>}
                </>
              )}
              {confirmed.paymentMethod === "efectivo" ? (
                <li>Pagas {formatCOP(confirmed.total)} en efectivo {confirmed.fulfillment === "domicilio" ? "cuando te entreguemos el pedido" : "al recoger"}.</li>
              ) : (
                <li>Recibimos tu comprobante de Nequi. Lo revisaremos y te avisaremos si hay algún problema.</li>
              )}
              <li>Tu hora puede ser ajustada por el equipo. Guarda el enlace de seguimiento para ver cuándo está listo.</li>
            </ul>
          </div>
          <div className="confirm-actions">
            <Link className="btn btn-primary" href={`/seguimiento/${confirmed.token}`}>Ver el estado de mi pedido</Link>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Imprimir o guardar recibo</button>
            {wa && <a className="btn btn-ghost" href={wa} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>}
            <Link className="link-btn" href="/#menu" onClick={() => { try { window.sessionStorage.removeItem(STORAGE_LAST); } catch { /* nada */ } }}>Hacer otro pedido</Link>
          </div>
        </section>

        <section className="receipt" aria-label="Recibo del pedido">
          <header className="receipt-head">
            <Logo name={businessName} logoUrl={logoUrl} />
            <div>
              <p className="receipt-title">Recibo de pedido</p>
              <p className="receipt-no">{orderNumberLabel(confirmed.number)}</p>
            </div>
          </header>
          <dl className="receipt-meta">
            {confirmed.customerName && <div><dt>Cliente</dt><dd>{confirmed.customerName}</dd></div>}
            <div><dt>Hora de realización del pedido</dt><dd>{formatStamp(confirmed.createdAt)}</dd></div>
            <div><dt>{confirmed.fulfillment === "domicilio" ? "Entrega a domicilio" : "Recogida"}</dt><dd>{formatShortDate(confirmed.pickupDate)}, {formatTime12(confirmed.pickupTime)}</dd></div>
            {confirmed.fulfillment === "domicilio" && confirmed.address && <div><dt>Dirección</dt><dd>{confirmed.address}</dd></div>}
            <div><dt>Forma de pago</dt><dd>{confirmed.paymentMethod === "nequi" ? "Nequi" : confirmed.fulfillment === "domicilio" ? "Efectivo al recibir" : "Efectivo al recoger"}</dd></div>
            <div>
              <dt>Hora de pago</dt>
              <dd>{confirmed.paymentMethod === "nequi" ? "Pendiente de verificación" : "-----"}</dd>
            </div>
          </dl>
          <table className="receipt-table">
            <thead><tr><th scope="col">Detalle</th><th scope="col" className="num">Cant.</th><th scope="col" className="num">Valor</th></tr></thead>
            <tbody>
              {confirmed.items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.name}{it.toppings.length > 0 && <small>{it.toppings.join(", ")}</small>}</td>
                  <td className="num">{it.quantity}</td>
                  <td className="num">{formatCOP(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="receipt-totals">
            <div><dt>Subtotal</dt><dd>{formatCOP(confirmed.subtotal)}</dd></div>
            {confirmed.discount > 0 && <div><dt>Descuento</dt><dd>-{formatCOP(confirmed.discount)}</dd></div>}
            <div><dt>IVA (0%)</dt><dd>{formatCOP(0)}</dd></div>
            <div className="receipt-total"><dt>Total</dt><dd>{formatCOP(confirmed.total)}</dd></div>
          </dl>
          <p className="receipt-foot">Fruta + chocolate = felicidad · Institución Educativa Sagrada Familia, Caloto, Cauca</p>
          <p className="receipt-link small">Seguimiento: {trackUrl}</p>
        </section>
      </div>
    );
  }

  // ---------------- Pantalla: formulario ----------------
  if (!hydrated || (!config && !loadError)) return <p className="checkout-loading">Cargando tu pedido…</p>;

  if (items.length === 0) {
    return (
      <section className="checkout-empty">
        <h1>Tu pedido está vacío</h1>
        <p className="muted">Elige tu bowl favorito y vuelve aquí para finalizar.</p>
        <Link href="/#menu" className="btn btn-primary">Ver el menú</Link>
      </section>
    );
  }

  if (loadError || !config) {
    return (
      <section className="checkout-empty">
        <h1>Casi listo</h1>
        <p className="notice" role="alert">{loadError ?? GENERIC}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Intentar de nuevo</button>
      </section>
    );
  }

  if (!config.ordersEnabled) {
    return (
      <section className="checkout-empty">
        <h1>¡Muchas gracias por todo!</h1>
        <p className="muted">El emprendimiento cierra por ahora y ya no estamos recibiendo pedidos. Nos veremos en un futuro próximo: esto no es un adiós, sino un hasta la próxima.</p>
        <Link href="/" className="btn btn-primary">Volver al inicio</Link>
      </section>
    );
  }

  const nequiDisplay = config.nequiNumber ? formatPhone(config.nequiNumber) : "";

  return (
    <div className="checkout-grid">
      <form className="checkout-form" onSubmit={submit} noValidate>
        <h1>Finaliza tu pedido</h1>

        <fieldset className="co-section">
          <legend>Tus datos</legend>
          <label className="field">
            <span>Nombre completo</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} required />
          </label>
          <label className="field">
            <span>Celular</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" required />
            <small className="hint">Lo usamos para avisarte cuando tu pedido esté listo.</small>
          </label>
          <label className="field">
            <span>Correo <span className="optional">(opcional)</span></span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" maxLength={254} />
            <small className="hint">Para enviarte tu recibo y tenerte en cuenta en futuros descuentos.</small>
          </label>
          {/* Campo trampa: las personas no lo ven, los robots sí lo llenan */}
          <label className="hp" aria-hidden="true">
            No lo llenes
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="co-section">
          <legend>¿Cómo lo quieres?</legend>
          <div className="pay-options" role="radiogroup" aria-label="Forma de entrega">
            <label className={`pay-option${fulfillment === "recoger" ? " is-on" : ""}`}>
              <input type="radio" name="ful" checked={fulfillment === "recoger"} onChange={() => setFulfillment("recoger")} />
              <span><strong>Recoger en el colegio</strong><small>Pasas por tu pedido a la hora que elijas.</small></span>
            </label>
            <label className={`pay-option${fulfillment === "domicilio" ? " is-on" : ""}`}>
              <input type="radio" name="ful" checked={fulfillment === "domicilio"} onChange={() => setFulfillment("domicilio")} />
              <span><strong>Domicilio a mi casa</strong><small>Te lo llevamos a tu dirección.</small></span>
            </label>
          </div>

          {fulfillment === "domicilio" && (
            <div className="address-box">
              <label className="field">
                <span>Dirección de entrega</span>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={300} placeholder="Barrio, calle o carrera y número" autoComplete="street-address" />
              </label>
              <label className="field">
                <span>Referencia <span className="optional">(opcional)</span></span>
                <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={200} placeholder="Casa de dos pisos, frente a la tienda…" />
              </label>
              <label className="field">
                <span>Ubicación en Google Maps <span className="optional">(opcional)</span></span>
                <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} inputMode="url" placeholder="Pega aquí el enlace de Google Maps" maxLength={500} />
                <small className="hint">En Google Maps mantén presionado tu casa, pulsa Compartir y copia el enlace. O usa el botón de abajo.</small>
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={shareMyLocation} disabled={locating}>
                {locating ? "Buscando tu ubicación…" : mapsUrl.includes("google.com/maps?q=") ? "Ubicación agregada ✓ (tocar para actualizar)" : "Usar mi ubicación actual"}
              </button>
            </div>
          )}
        </fieldset>

        <fieldset className="co-section">
          <legend>{fulfillment === "domicilio" ? "¿Cuándo te lo llevamos?" : "¿Cuándo lo recoges?"}</legend>
          {days.length === 0 ? (
            <p className="notice" role="status">Por ahora no hay horarios disponibles. Intenta más tarde.</p>
          ) : (
            <>
              <div className="chip-row" role="radiogroup" aria-label="Día de recogida">
                {days.map((d) => (
                  <button key={d.date} type="button" role="radio" aria-checked={date === d.date} className="chip-btn" onClick={() => { setDate(d.date); setTime(""); }}>
                    {formatShortDate(d.date)}
                  </button>
                ))}
              </div>
              {date && (
                <div className="chip-row" role="radiogroup" aria-label="Hora de recogida">
                  {slots.map((s) => (
                    <button key={s.time} type="button" role="radio" aria-checked={time === s.time} className="chip-btn" onClick={() => setTime(s.time)}>
                      {formatTime12(s.time)}
                      {s.remaining <= 2 && <small> · últimos cupos</small>}
                    </button>
                  ))}
                </div>
              )}
              <small className="hint">El equipo puede ajustar la hora exacta y te la mostrará en el seguimiento del pedido.</small>
            </>
          )}
        </fieldset>

        <fieldset className="co-section">
          <legend>Forma de pago</legend>
          <div className="pay-options" role="radiogroup" aria-label="Forma de pago">
            {config.cashEnabled && (
              <label className={`pay-option${method === "efectivo" ? " is-on" : ""}`}>
                <input type="radio" name="pay" checked={method === "efectivo"} onChange={() => setMethod("efectivo")} />
                <span><strong>{fulfillment === "domicilio" ? "Efectivo al recibir" : "Efectivo al recoger"}</strong><small>{fulfillment === "domicilio" ? "Pagas cuando te entreguemos el pedido." : "Pagas cuando llegues por tu pedido."}</small></span>
              </label>
            )}
            {config.nequiEnabled && (
              <label className={`pay-option${method === "nequi" ? " is-on" : ""}`}>
                <input type="radio" name="pay" checked={method === "nequi"} onChange={() => setMethod("nequi")} />
                <span><strong>Nequi</strong><small>Pagas ahora y subes la captura.</small></span>
              </label>
            )}
          </div>

          {method === "nequi" && config.nequiNumber && (
            <div className="nequi-box">
              <p>Envía <strong>{formatCOP(total)}</strong> por Nequi a este número:</p>
              <div className="nequi-number">
                <strong>{nequiDisplay}</strong>
                <button type="button" className="btn btn-ghost btn-sm" onClick={copyNumber}>{copied ? "¡Copiado!" : "Copiar"}</button>
              </div>
              {config.nequiHolder && <p className="small muted">A nombre de {config.nequiHolder}.</p>}
              <label className="field">
                <span>Sube la captura de tu pago</span>
                <input type="file" accept="image/*" onChange={(e) => onPickReceipt(e.target.files?.[0] ?? null)} />
              </label>
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Vista previa de tu comprobante" className="receipt-preview" />
              )}
              <small className="hint">Verificaremos tu pago antes de confirmar el pedido. Solo el equipo puede ver tu captura.</small>
            </div>
          )}
        </fieldset>

        <fieldset className="co-section">
          <legend>Observaciones <span className="optional">(opcional)</span></legend>
          <label className="field">
            <span className="sr-only">Observaciones</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Alergias, sin algún ingrediente, etc." />
          </label>
        </fieldset>

        {error && <p ref={errorRef} className="form-error" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? "Enviando tu pedido…" : `Confirmar pedido · ${formatCOP(total)}`}
        </button>
        <p className="small muted center">Tu pedido solo queda registrado cuando ves la pantalla “¡Pedido recibido!”.</p>
      </form>

      <aside className="checkout-summary" aria-label="Resumen del pedido">
        <h2 className="h3">Tu pedido</h2>
        <ul>
          {items.map((i) => (
            <li key={i.key}>
              <span>{i.quantity} × {i.name}{i.toppings.length > 0 && <small>{i.toppings.map((t) => t.name).join(", ")}</small>}</span>
              <strong>{formatCOP(lineUnit(i) * i.quantity)}</strong>
            </li>
          ))}
        </ul>
        <dl className="totals">
          <div><dt>Subtotal</dt><dd>{formatCOP(subtotal)}</dd></div>
          {discount > 0 && <div><dt>Descuento</dt><dd>-{formatCOP(discount)}</dd></div>}
          <div><dt>IVA (0%)</dt><dd>{formatCOP(0)}</dd></div>
          <div className="totals-final"><dt>Total</dt><dd>{formatCOP(total)}</dd></div>
        </dl>
        <button type="button" className="link-btn" onClick={openCart}>Editar mi pedido</button>
      </aside>
    </div>
  );
}
