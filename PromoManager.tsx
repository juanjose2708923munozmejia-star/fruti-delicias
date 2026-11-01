"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCOP } from "@/lib/format";
import { createPromo, deletePromo, setPromoActive } from "@/app/admin/codigos/actions";

export type PromoRow = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  one_per_phone: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

type Note = { kind: "ok" | "error"; text: string } | null;

function randomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  return `${pick(letters)}${pick(letters)}${Math.floor(10 + Math.random() * 90)}`;
}

function expiryText(iso: string | null): string {
  if (!iso) return "Sin vencimiento";
  const d = new Date(iso);
  const text = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" }).format(d);
  return d.getTime() < Date.now() ? `Vencido el ${text}` : `Vence el ${text}`;
}

export function PromoManager({ codes }: { codes: PromoRow[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percent" | "amount">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [onePerPhone, setOnePerPhone] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [rowNote, setRowNote] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<string | null>(null);

  async function create() {
    const v = Number(value);
    const m = maxUses.trim() === "" ? null : Number(maxUses);
    if (!/^[A-Za-z0-9-]{3,20}$/.test(code.trim())) return setNote({ kind: "error", text: "El código debe tener de 3 a 20 letras, números o guiones. Ejemplo: JL50." });
    if (!Number.isInteger(v) || v < 1) return setNote({ kind: "error", text: "Escribe el valor del descuento." });
    if (type === "percent" && v > 100) return setNote({ kind: "error", text: "El porcentaje máximo es 100." });
    if (m !== null && (!Number.isInteger(m) || m < 1)) return setNote({ kind: "error", text: "Los usos máximos deben ser un número entero o quedar vacíos." });
    setBusy("crear");
    setNote(null);
    try {
      const r = await createPromo({ code, description, type, value: v, maxUses: m, expiresOn: expiresOn || null, onePerPhone });
      if (!r.ok) return setNote({ kind: "error", text: r.error });
      setCode(""); setDescription(""); setValue(""); setMaxUses(""); setExpiresOn("");
      setNote({ kind: "ok", text: "Código creado. Ya se puede usar al finalizar un pedido." });
      router.refresh();
    } catch {
      setNote({ kind: "error", text: "No hubo respuesta. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  async function toggle(c: PromoRow) {
    setBusy(c.id);
    try {
      const r = await setPromoActive(c.id, !c.is_active);
      if (r.ok) router.refresh();
      else setRowNote((n) => ({ ...n, [c.id]: r.error }));
    } catch {
      setRowNote((n) => ({ ...n, [c.id]: "No hubo respuesta. Inténtalo de nuevo." }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(c: PromoRow) {
    setBusy(c.id);
    try {
      const r = await deletePromo(c.id);
      if (r.ok) router.refresh();
      else setRowNote((n) => ({ ...n, [c.id]: r.error }));
    } catch {
      setRowNote((n) => ({ ...n, [c.id]: "No hubo respuesta. Inténtalo de nuevo." }));
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  return (
    <div className="promo-admin">
      <section className="edit-card is-new" aria-label="Crear código">
        <h2 className="h3">Nuevo código</h2>
        <div className="two-cols">
          <label className="field">
            <span>Código</span>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} placeholder="JL50" autoCapitalize="characters" />
          </label>
          <div className="field"><span>&nbsp;</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => setCode(randomCode())}>Generar uno al azar</button></div>
        </div>
        <div className="two-cols">
          <label className="field">
            <span>Tipo de descuento</span>
            <select value={type} onChange={(e) => setType(e.target.value as "percent" | "amount")}>
              <option value="percent">Porcentaje (%)</option>
              <option value="amount">Valor fijo (COP)</option>
            </select>
          </label>
          <label className="field">
            <span>{type === "percent" ? "Porcentaje" : "Valor en pesos"}</span>
            <input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={type === "percent" ? "50" : "1000"} />
          </label>
        </div>
        <div className="two-cols">
          <label className="field"><span>Usos máximos <span className="optional">(vacío = sin límite)</span></span><input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} inputMode="numeric" /></label>
          <label className="field"><span>Vence el <span className="optional">(opcional)</span></span><input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} /></label>
        </div>
        <label className="field"><span>Nota para ti <span className="optional">(opcional)</span></span><input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} placeholder="Para clientes frecuentes" /></label>
        <label className="check-line"><input type="checkbox" checked={onePerPhone} onChange={(e) => setOnePerPhone(e.target.checked)} /> <span>Cada celular solo puede usarlo una vez</span></label>
        <div className="inline-form"><button type="button" className="btn btn-primary btn-sm" onClick={create} disabled={busy !== null}>{busy === "crear" ? "Creando…" : "Crear código"}</button></div>
        <p className={`order-note${note ? ` ${note.kind}` : ""}`} role="status" aria-live="polite">{note?.text ?? ""}</p>
      </section>

      <section aria-label="Códigos creados">
        <h2 className="h3">Códigos creados</h2>
        {codes.length === 0 ? (
          <div className="info-card"><p>Todavía no hay códigos. Crea el primero a la izquierda.</p></div>
        ) : (
          <ul className="promo-list">
            {codes.map((c) => {
              const expired = c.expires_at !== null && new Date(c.expires_at).getTime() < Date.now();
              const spent = c.max_uses !== null && c.used_count >= c.max_uses;
              const state = !c.is_active ? "Apagado" : expired ? "Vencido" : spent ? "Agotado" : "Activo";
              return (
                <li key={c.id} className="promo-item">
                  <div className="promo-main">
                    <strong className="promo-code">{c.code}</strong>
                    <span className={`badge ${state === "Activo" ? "st-listo" : "st-cancelado"}`}>{state}</span>
                  </div>
                  <p className="small">
                    {c.discount_percent ? `${c.discount_percent} % de descuento` : `${formatCOP(c.discount_amount ?? 0)} de descuento`} ·{" "}
                    usado {c.used_count}{c.max_uses ? ` de ${c.max_uses}` : ""} {c.used_count === 1 ? "vez" : "veces"} · {expiryText(c.expires_at)}
                    {c.one_per_phone ? " · una vez por celular" : ""}
                  </p>
                  {c.description && <p className="small muted">{c.description}</p>}
                  <div className="inline-form">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(c)} disabled={busy !== null}>{c.is_active ? "Apagar" : "Encender"}</button>
                    <button type="button" className="icon-btn icon-danger" aria-label={`Eliminar el código ${c.code}`} title="Eliminar" onClick={() => setConfirm(confirm === c.id ? null : c.id)}>
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>
                  {confirm === c.id && (
                    <div className="order-panel order-panel-danger" role="alertdialog" aria-label="Confirmar eliminación">
                      <strong>¿Eliminar el código {c.code}?</strong>
                      <div className="inline-form">
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(c)} disabled={busy !== null}>Sí, eliminar</button>
                        <button type="button" className="link-btn" onClick={() => setConfirm(null)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                  {rowNote[c.id] && <p className="order-note error" role="alert">{rowNote[c.id]}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
