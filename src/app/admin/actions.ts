"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import type { ActionResult } from "@/lib/action-result";

const ALLOWED = ["orders_enabled", "topping_roulette_enabled", "cash_enabled", "nequi_enabled"] as const;

/** Interruptores rápidos de la página (solo estas opciones están permitidas). */
export async function setSetting(key: string, value: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ key: z.enum(ALLOWED), value: z.boolean() }).safeParse({ key, value });
  if (!parsed.success) return { ok: false, error: "Opción no permitida." };
  const { error } = await supabase.from("settings").update({ [parsed.data.key]: parsed.data.value }).eq("id", 1);
  return error ? { ok: false, error: "No se pudo guardar. Intenta de nuevo." } : { ok: true };
}
