"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { ORDER_STATUSES } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

const FAIL: ActionResult = { ok: false, error: "No se pudo completar. Intenta de nuevo." };
const uuid = z.string().uuid();

/** Cambia el estado del pedido. */
export async function updateOrderStatus(id: string, status: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: uuid, status: z.enum(ORDER_STATUSES) }).safeParse({ id, status });
  if (!parsed.success) return FAIL;
  const { error } = await supabase.from("orders").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  return error ? FAIL : { ok: true };
}

/** Asigna (o quita) la hora de recogida que verá el cliente en su seguimiento. */
export async function assignPickupTime(id: string, time: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id: uuid, time: z.string().regex(/^(\d{2}:\d{2})?$/) }).safeParse({ id, time });
  if (!parsed.success) return FAIL;
  const { error } = await supabase
    .from("orders")
    .update({ assigned_pickup_time: parsed.data.time === "" ? null : parsed.data.time })
    .eq("id", parsed.data.id);
  return error ? FAIL : { ok: true };
}

/** Verifica, rechaza o deshace el pago (comprobante de Nequi o efectivo recibido). */
export async function setPayment(id: string, decision: string): Promise<ActionResult> {
  const { supabase, user } = await requireAdmin();
  const parsed = z.object({ id: uuid, decision: z.enum(["verificado", "rechazado", "pendiente"]) }).safeParse({ id, decision });
  if (!parsed.success) return FAIL;
  const { id: orderId, decision: d } = parsed.data;
  const patch =
    d === "verificado"
      ? { payment_status: "verificado", paid_at: new Date().toISOString(), payment_verified_by: user.id }
      : { payment_status: d, paid_at: null, payment_verified_by: d === "rechazado" ? user.id : null };
  const res = await supabase.from("orders").update(patch).eq("id", orderId);
  if (res.error) return FAIL;
  if (d === "verificado") {
    // Al verificar el pago, un pedido nuevo pasa a confirmado.
    await supabase.from("orders").update({ status: "confirmado" }).eq("id", orderId).eq("status", "nuevo");
  }
  return { ok: true };
}

/** Edita los datos del pedido (nombre, observaciones, día y hora de recogida). */
export async function editOrder(
  id: string,
  data: { name: string; notes: string; pickupDate: string; pickupTime: string; address?: string },
): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({
      id: uuid,
      name: z.string().trim().min(2).max(120),
      notes: z.string().trim().max(500),
      pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      pickupTime: z.string().regex(/^\d{2}:\d{2}$/),
      address: z.string().trim().max(300).optional(),
    })
    .safeParse({ id, ...data });
  if (!parsed.success) return { ok: false, error: "Revisa los datos: el nombre, el día y la hora son obligatorios." };
  const p = parsed.data;
  const { error } = await supabase
    .from("orders")
    .update({
      customer_name: p.name,
      notes: p.notes || null,
      pickup_date: p.pickupDate,
      pickup_time: p.pickupTime,
      ...(p.address !== undefined ? { delivery_address: p.address || null } : {}),
    })
    .eq("id", p.id);
  return error ? FAIL : { ok: true };
}

/** Elimina el pedido (y su comprobante). No se puede deshacer. */
export async function deleteOrder(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return FAIL;
  const found = await supabase.from("orders").select("payment_receipt_path").eq("id", parsed.data).maybeSingle();
  const path = (found.data as { payment_receipt_path: string | null } | null)?.payment_receipt_path ?? null;
  const { error } = await supabase.from("orders").delete().eq("id", parsed.data);
  if (error) return FAIL;
  if (path) await supabase.storage.from("receipts").remove([path]);
  return { ok: true };
}
