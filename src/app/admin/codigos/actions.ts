"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import type { ActionResult } from "@/lib/action-result";

const FAIL = { ok: false as const, error: "No se pudo completar. Intenta de nuevo." };

const createSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/),
    description: z.string().trim().max(120),
    type: z.enum(["percent", "amount"]),
    value: z.number().int().min(1).max(1000000),
    maxUses: z.number().int().min(1).max(100000).nullable(),
    expiresOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    onePerPhone: z.boolean(),
  })
  .refine((v) => v.type !== "percent" || v.value <= 100, "El porcentaje máximo es 100.");

/** Crea un código de descuento (por ejemplo JL50). Un teléfono solo puede usarlo una vez si así se elige. */
export async function createPromo(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa el código (3 a 20 letras, números o guiones) y el valor del descuento (si es porcentaje, máximo 100)." };
  }
  const p = parsed.data;
  const { error } = await supabase.from("promo_codes").insert({
    code: p.code,
    description: p.description || null,
    discount_percent: p.type === "percent" ? p.value : null,
    discount_amount: p.type === "amount" ? p.value : null,
    max_uses: p.maxUses,
    one_per_phone: p.onePerPhone,
    expires_at: p.expiresOn ? `${p.expiresOn}T23:59:59-05:00` : null,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Ya existe un código con ese nombre. Elige otro." : FAIL.error };
  }
  return { ok: true };
}

export async function setPromoActive(id: string, active: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse({ id, active });
  if (!parsed.success) return FAIL;
  const { error } = await supabase.from("promo_codes").update({ is_active: parsed.data.active }).eq("id", parsed.data.id);
  return error ? FAIL : { ok: true };
}

export async function deletePromo(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return FAIL;
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  return error ? FAIL : { ok: true };
}
