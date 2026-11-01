"use client";

import { useState } from "react";
import { setSetting } from "@/app/admin/actions";

type Flags = { orders_enabled: boolean; topping_roulette_enabled: boolean; cash_enabled: boolean; nequi_enabled: boolean };
type Key = keyof Flags;

const ROWS: { key: Key; label: string; hint: string }[] = [
  { key: "orders_enabled", label: "Recibir pedidos", hint: "Apagado = la página muestra todo como agotado y no deja pedir." },
  { key: "topping_roulette_enabled", label: "Ruleta de toppings", hint: "Apagada = el cliente ya no ve la ruleta al personalizar." },
  { key: "cash_enabled", label: "Pago en efectivo", hint: "Al recoger o al recibir el domicilio." },
  { key: "nequi_enabled", label: "Pago por Nequi", hint: "Con captura del comprobante." },
];

export function QuickSettings({ initial }: { initial: Flags }) {
  const [flags, setFlags] = useState<Flags>(initial);
  const [busy, setBusy] = useState<Key | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function toggle(key: Key) {
    if (busy) return;
    const next = !flags[key];
    setFlags({ ...flags, [key]: next });
    setBusy(key);
    setNote(null);
    try {
      const r = await setSetting(key, next);
      if (r.ok) setNote({ kind: "ok", text: "Guardado. Ya se ve en la página." });
      else {
        setFlags((f) => ({ ...f, [key]: !next }));
        setNote({ kind: "error", text: r.error });
      }
    } catch {
      setFlags((f) => ({ ...f, [key]: !next }));
      setNote({ kind: "error", text: "No hubo respuesta. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="info-card quick-settings" aria-label="Ajustes rápidos">
      <h2 className="h3">Ajustes rápidos</h2>
      <ul>
        {ROWS.map((r) => (
          <li key={r.key}>
            <div>
              <strong>{r.label}</strong>
              <p className="small muted">{r.hint}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flags[r.key]}
              aria-label={r.label}
              className={`switch${flags[r.key] ? " on" : ""}`}
              onClick={() => toggle(r.key)}
              disabled={busy !== null}
            >
              <span className="switch-knob" />
              <span className="switch-text">{flags[r.key] ? "Activado" : "Apagado"}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={`order-note${note ? ` ${note.kind}` : ""}`} role="status" aria-live="polite">{note?.text ?? ""}</p>
    </section>
  );
}
