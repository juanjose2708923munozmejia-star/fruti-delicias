"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToJpeg } from "@/lib/image";
import { formatPhone, normalizePhone } from "@/lib/phone";

type Props = { userId: string; email: string; emailVerified: boolean; fullName: string; phone: string; avatarUrl: string | null };
type Note = { kind: "ok" | "error"; text: string } | null;

const ALERT_KEY = "bp-admin-alerts";

export function AccountClient({ userId, email, emailVerified, fullName, phone, avatarUrl }: Props) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone ? formatPhone(phone) : "");
  const [photo, setPhoto] = useState<string | null>(avatarUrl);
  const [profileNote, setProfileNote] = useState<Note>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [passNote, setPassNote] = useState<Note>(null);

  const [devNote, setDevNote] = useState<Note>(null);
  const [alertsOn, setAlertsOn] = useState(false);
  const [alertNote, setAlertNote] = useState<Note>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAlertsOn(window.localStorage.getItem(ALERT_KEY) === "on");
    } catch {
      /* sin almacenamiento */
    }
  }, []);

  async function saveProfile() {
    const digits = tel.trim() === "" ? null : normalizePhone(tel);
    if (name.trim().length < 2) return setProfileNote({ kind: "error", text: "Escribe tu nombre (mínimo 2 letras)." });
    if (tel.trim() !== "" && !digits) return setProfileNote({ kind: "error", text: "Escribe un celular colombiano válido de 10 dígitos (empieza por 3)." });
    setBusy("perfil");
    setProfileNote(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("admins").update({ full_name: name.trim(), phone: digits }).eq("id", userId);
      if (error) throw error;
      setProfileNote({ kind: "ok", text: "Perfil guardado." });
      router.refresh();
    } catch {
      setProfileNote({ kind: "error", text: "No se pudo guardar. Intenta de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    setBusy("foto");
    setProfileNote(null);
    try {
      const small = await resizeToJpeg(file, 512, 0.85);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const up = await supabase.storage.from("avatars").upload(path, small, { contentType: "image/jpeg", upsert: true });
      if (up.error) throw up.error;
      const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from("admins").update({ avatar_url: url }).eq("id", userId);
      if (error) throw error;
      setPhoto(url);
      setProfileNote({ kind: "ok", text: "Foto actualizada." });
      router.refresh();
    } catch {
      setProfileNote({ kind: "error", text: "No se pudo subir la foto. Prueba con otra imagen (JPG o PNG)." });
    } finally {
      setBusy(null);
    }
  }

  async function changePassword() {
    if (!current) return setPassNote({ kind: "error", text: "Escribe tu contraseña actual." });
    if (next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      return setPassNote({ kind: "error", text: "La nueva contraseña debe tener mínimo 10 caracteres, con letras y números." });
    }
    if (next === current) return setPassNote({ kind: "error", text: "La nueva contraseña debe ser distinta a la actual." });
    if (next !== again) return setPassNote({ kind: "error", text: "Las dos contraseñas nuevas no coinciden." });
    setBusy("clave");
    setPassNote(null);
    try {
      const supabase = createClient();
      const check = await supabase.auth.signInWithPassword({ email, password: current });
      if (check.error) return setPassNote({ kind: "error", text: "La contraseña actual no es correcta." });
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) return setPassNote({ kind: "error", text: "No se pudo cambiar la contraseña. Prueba con una más larga o distinta." });
      setCurrent(""); setNext(""); setAgain("");
      setPassNote({ kind: "ok", text: "Contraseña cambiada. Úsala la próxima vez que entres." });
    } catch {
      setPassNote({ kind: "error", text: "No hubo respuesta. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  async function signOutOthers() {
    setBusy("dispositivos");
    setDevNote(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      setDevNote({ kind: "ok", text: "Listo: se cerró tu sesión en todos los demás dispositivos." });
    } catch {
      setDevNote({ kind: "error", text: "No se pudo completar. Intenta de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  async function toggleAlerts() {
    setAlertNote(null);
    if (alertsOn) {
      try { window.localStorage.setItem(ALERT_KEY, "off"); } catch { /* nada */ }
      setAlertsOn(false);
      return;
    }
    try { window.localStorage.setItem(ALERT_KEY, "on"); } catch { /* nada */ }
    setAlertsOn(true);
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    } catch { /* nada */ }
    setAlertNote({ kind: "ok", text: "Activado: sonará un aviso cuando llegue un pedido nuevo mientras tengas abierta la lista de pedidos." });
  }

  function downloadInfo() {
    const data = { correo: email, correo_verificado: emailVerified, nombre: name, celular: tel, foto: photo, rol: "Administrador", descargado: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mi-informacion.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const initial = (name || email || "A").slice(0, 1).toUpperCase();

  return (
    <div className="account">
      <section className="account-card" aria-labelledby="acc-profile">
        <h2 id="acc-profile" className="h3">Perfil</h2>
        <div className="account-photo">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Tu foto de perfil" className="avatar avatar-lg" />
          ) : (
            <span className="avatar avatar-lg avatar-fallback" aria-hidden="true">{initial}</span>
          )}
          <label className="btn btn-ghost btn-sm file-btn">
            {busy === "foto" ? "Subiendo…" : "Cambiar foto"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => uploadPhoto(e.target.files?.[0] ?? null)} disabled={busy !== null} />
          </label>
        </div>
        <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></label>
        <label className="field"><span>Teléfono celular</span><input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="320 718 6351" /></label>
        <div className="account-email">
          <span className="small muted">Correo</span>
          <strong>{email}</strong>
          <span className={`badge ${emailVerified ? "st-listo" : "st-nuevo"}`}>{emailVerified ? "✓ Verificado" : "Sin verificar"}</span>
        </div>
        <div className="inline-form"><button type="button" className="btn btn-primary btn-sm" onClick={saveProfile} disabled={busy !== null}>{busy === "perfil" ? "Guardando…" : "Guardar perfil"}</button></div>
        <p className={`order-note${profileNote ? ` ${profileNote.kind}` : ""}`} role="status" aria-live="polite">{profileNote?.text ?? ""}</p>
      </section>

      <section className="account-card" aria-labelledby="acc-pass">
        <h2 id="acc-pass" className="h3">Contraseña</h2>
        <label className="field"><span>Contraseña actual</span><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></label>
        <label className="field"><span>Nueva contraseña</span><input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /><small className="hint">Mínimo 10 caracteres, con letras y números. No la compartas con nadie.</small></label>
        <label className="field"><span>Repite la nueva contraseña</span><input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></label>
        <div className="inline-form"><button type="button" className="btn btn-primary btn-sm" onClick={changePassword} disabled={busy !== null}>{busy === "clave" ? "Cambiando…" : "Cambiar contraseña"}</button></div>
        <p className={`order-note${passNote ? ` ${passNote.kind}` : ""}`} role="status" aria-live="polite">{passNote?.text ?? ""}</p>
      </section>

      <section className="account-card" aria-labelledby="acc-dev">
        <h2 id="acc-dev" className="h3">Acceso y dispositivos</h2>
        <p className="muted">Si entraste desde un computador o celular que no es tuyo, cierra la sesión en todos los demás dispositivos. Esta sesión se mantiene.</p>
        <div className="inline-form"><button type="button" className="btn btn-ghost btn-sm" onClick={signOutOthers} disabled={busy !== null}>{busy === "dispositivos" ? "Cerrando…" : "Cerrar sesión en los demás dispositivos"}</button></div>
        <p className={`order-note${devNote ? ` ${devNote.kind}` : ""}`} role="status" aria-live="polite">{devNote?.text ?? ""}</p>
      </section>

      <section className="account-card" aria-labelledby="acc-notif">
        <h2 id="acc-notif" className="h3">Notificaciones</h2>
        <p className="muted">Recibe un sonido y un aviso del navegador cuando llegue un pedido nuevo. Funciona mientras tengas abierta la lista de pedidos.</p>
        <button type="button" role="switch" aria-checked={alertsOn} className={`switch${alertsOn ? " on" : ""}`} onClick={toggleAlerts}>
          <span className="switch-knob" />
          <span className="switch-text">{alertsOn ? "Activadas" : "Apagadas"}</span>
        </button>
        <p className={`order-note${alertNote ? ` ${alertNote.kind}` : ""}`} role="status" aria-live="polite">{alertNote?.text ?? ""}</p>
      </section>

      <section className="account-card" aria-labelledby="acc-priv">
        <h2 id="acc-priv" className="h3">Privacidad</h2>
        <p className="muted">Descarga una copia de la información de tu cuenta de administrador.</p>
        <div className="inline-form"><button type="button" className="btn btn-ghost btn-sm" onClick={downloadInfo}>Descargar mi información</button></div>
      </section>
    </div>
  );
}
