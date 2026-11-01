"use client";

import { useEffect, useRef } from "react";
import { orderNumberLabel } from "@/lib/colombia";

const ALERT_KEY = "bp-admin-alerts";

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  } catch {
    /* el navegador bloqueó el sonido */
  }
}

/** Avisa (sonido y notificación) cuando llega un pedido nuevo a la lista. Se activa en "Mi cuenta". */
export function NewOrderAlert({ latestId, latestNumber }: { latestId: string | null; latestNumber: number | null }) {
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (previous.current === undefined) {
      previous.current = latestId;
      return;
    }
    if (latestId && latestId !== previous.current) {
      previous.current = latestId;
      let on = false;
      try {
        on = window.localStorage.getItem(ALERT_KEY) === "on";
      } catch {
        on = false;
      }
      if (!on) return;
      beep();
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("¡Pedido nuevo!", { body: latestNumber ? `Llegó el pedido ${orderNumberLabel(latestNumber)}.` : "Llegó un pedido nuevo." });
        }
      } catch {
        /* sin notificaciones */
      }
    }
  }, [latestId, latestNumber]);
  return null;
}
