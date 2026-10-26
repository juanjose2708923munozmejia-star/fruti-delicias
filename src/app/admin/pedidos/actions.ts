"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { ORDER_STATUSES } from "@/lib/labels";

const id = z.string().uuid();

function refresh() {
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
}

/** Cambia el estado del pedido (nuevo, confirmado, en preparación, listo, entregado, cancelado). */
export async function updateOrderStatus(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ id, status: z.enum(ORDER_STATUSES) }).safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  await supabase.from("orders").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  refresh();
}

/** Asigna (o quita) la hora de recogida que verá el cliente en su seguimiento. */
export async function assignPickupTime(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const parsed = z
    .object({ id, time: z.string().regex(/^(\d{2}:\d{2})?$/) })
    .safeParse({ id: formData.get("id"), time: String(formData.get("time") ?? "") });
  if (!parsed.success) return;
  await supabase
    .from("orders")
    .update({ assigned_pickup_time: parsed.data.time === "" ? null : parsed.data.time })
    .eq("id", parsed.data.id);
  refresh();
}

/** Verifica o rechaza el pago (comprobante de Nequi o pago en efectivo recibido). */
export async function setPayment(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin();
  const parsed = z
    .object({ id, decision: z.enum(["verificado", "rechazado", "pendiente"]) })
    .safeParse({ id: formData.get("id"), decision: formData.get("decision") });
  if (!parsed.success) return;
  const { id: orderId, decision } = parsed.data;

  const patch =
    decision === "verificado"
      ? { payment_status: "verificado", paid_at: new Date().toISOString(), payment_verified_by: user.id }
      : { payment_status: decision, paid_at: null, payment_verified_by: decision === "rechazado" ? user.id : null };
  const res = await supabase.from("orders").update(patch).eq("id", orderId);
  if (!res.error && decision === "verificado") {
    // Al verificar el pago, un pedido nuevo pasa a confirmado.
    await supabase.from("orders").update({ status: "confirmado" }).eq("id", orderId).eq("status", "nuevo");
  }
  refresh();
}
