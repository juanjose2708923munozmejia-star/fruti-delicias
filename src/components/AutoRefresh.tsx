"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarga la lista de pedidos sola, sin interrumpir si estás escribiendo o con un panel abierto. */
export function AutoRefresh({ seconds = 45 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      if (document.querySelector("[data-panel-open='true']")) return;
      router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
