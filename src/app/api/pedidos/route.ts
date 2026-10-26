import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailability } from "@/lib/availability";
import { normalizePhone } from "@/lib/phone";
import { weekdayOf } from "@/lib/colombia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GENERIC = "Lo sentimos, ocurrió un problema. Intenta nuevamente.";
const UNAVAILABLE = "Algunos productos de tu pedido ya no están disponibles. Vacía el pedido y vuelve a agregarlos.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024; // Vercel limita el cuerpo de la petición a 4,5 MB

class UserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().max(64),
        quantity: z.number().int().min(1).max(50),
        toppingIds: z.array(z.string().max(64)).max(20),
      }),
    )
    .min(1)
    .max(30),
  name: z.string().max(120),
  phone: z.string().max(40),
  email: z.string().max(254).optional().default(""),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(600).optional().default(""),
  paymentMethod: z.enum(["efectivo", "nequi"]),
  idempotencyKey: z.string().min(8).max(100),
  website: z.string().max(200).optional().default(""), // campo trampa contra robots
});

const clean = (s: string) => s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

/** Reconoce la imagen por su contenido real (no se confía en lo que diga el navegador). */
function detectImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png" };
  }
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

type SettingsRow = {
  orders_enabled: boolean;
  max_items_per_order: number;
  min_lead_minutes: number;
  max_days_ahead: number;
  cash_enabled: boolean;
  nequi_enabled: boolean;
  nequi_number: string | null;
};
type ProductRow = { id: string; name: string; price: number; product_toppings: { topping_id: string }[] | null };
type ToppingRow = { id: string; name: string; price: number };

type OrderRow = {
  id: string;
  order_number: number;
  pickup_date: string;
  pickup_time: string;
  total: number;
  subtotal: number;
  discount: number;
  payment_method: "efectivo" | "nequi";
  payment_status: string;
  created_at: string;
  customer_name: string | null;
  review_token: string;
  order_items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    order_item_toppings: { topping_name: string; price: number }[] | null;
  }[] | null;
};

const ORDER_SELECT =
  "id, order_number, pickup_date, pickup_time, total, subtotal, discount, payment_method, payment_status, created_at, customer_name, review_token, order_items(product_name, quantity, unit_price, line_total, order_item_toppings(topping_name, price))";

function toResponse(o: OrderRow) {
  return {
    number: o.order_number,
    token: o.review_token,
    customerName: o.customer_name,
    pickupDate: o.pickup_date,
    pickupTime: o.pickup_time.slice(0, 5),
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
    items: (o.order_items ?? []).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
      toppings: (i.order_item_toppings ?? []).map((t) => t.topping_name),
    })),
  };
}

async function loadOrder(admin: SupabaseClient, orderId: string): Promise<OrderRow> {
  const { data, error } = await admin.from("orders").select(ORDER_SELECT).eq("id", orderId).single();
  if (error || !data) throw new Error("No se pudo leer el pedido creado");
  return data as unknown as OrderRow;
}

export async function POST(request: Request) {
  let admin: SupabaseClient | null = null;
  let createdOrderId: string | null = null;
  let uploadedPath: string | null = null;
  let finished = false;

  try {
    // ---------- 1. Leer y validar la forma de los datos ----------
    const form = await request.formData();
    const rawData = form.get("data");
    if (typeof rawData !== "string" || rawData.length > 20000) throw new UserError(GENERIC);
    let json: unknown;
    try {
      json = JSON.parse(rawData);
    } catch {
      throw new UserError(GENERIC);
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) throw new UserError("Revisa los datos de tu pedido e inténtalo de nuevo.");
    const data = parsed.data;
    if (data.website) throw new UserError(GENERIC);

    const name = clean(data.name);
    if (name.length < 2) throw new UserError("Escribe tu nombre completo.");
    const phone = normalizePhone(data.phone);
    if (!phone) throw new UserError("Escribe un celular colombiano válido de 10 dígitos (empieza por 3).");
    const email = data.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new UserError("Revisa tu correo electrónico: no parece válido.");
    const notes = clean(data.notes);

    admin = createAdminClient();

    // ---------- 2. Configuración y reglas del negocio ----------
    const settingsRes = await admin
      .from("settings")
      .select("orders_enabled, max_items_per_order, min_lead_minutes, max_days_ahead, cash_enabled, nequi_enabled, nequi_number")
      .eq("id", 1)
      .single();
    if (settingsRes.error || !settingsRes.data) throw new Error("Sin configuración");
    const settings = settingsRes.data as SettingsRow;

    if (!settings.orders_enabled) throw new UserError("Por ahora no estamos recibiendo pedidos.", 409);
    if (data.paymentMethod === "nequi" && !(settings.nequi_enabled && settings.nequi_number)) {
      throw new UserError("El pago por Nequi no está disponible por ahora. Elige efectivo al recoger.", 409);
    }
    if (data.paymentMethod === "efectivo" && !settings.cash_enabled) {
      throw new UserError("El pago en efectivo no está disponible por ahora. Elige Nequi.", 409);
    }

    // ---------- 3. Pedido duplicado (doble clic o reintento) ----------
    const existing = await admin.from("orders").select("id").eq("idempotency_key", data.idempotencyKey).maybeSingle();
    if (existing.data) {
      const order = await loadOrder(admin, (existing.data as { id: string }).id);
      finished = true;
      return NextResponse.json({ ok: true, order: toResponse(order) });
    }

    // ---------- 4. Productos, toppings y precios (el servidor recalcula todo) ----------
    const totalQty = data.items.reduce((n, i) => n + i.quantity, 0);
    if (totalQty > settings.max_items_per_order) {
      throw new UserError(`Puedes pedir máximo ${settings.max_items_per_order} productos por pedido.`);
    }
    const productIds = Array.from(new Set(data.items.map((i) => i.productId)));
    const toppingIds = Array.from(new Set(data.items.flatMap((i) => i.toppingIds)));
    if (![...productIds, ...toppingIds].every((id) => UUID.test(id))) throw new UserError(UNAVAILABLE, 409);

    const [productsRes, toppingsRes] = await Promise.all([
      admin.from("products").select("id, name, price, product_toppings(topping_id)").in("id", productIds).eq("is_active", true),
      toppingIds.length > 0
        ? admin.from("toppings").select("id, name, price").in("id", toppingIds).eq("is_active", true)
        : Promise.resolve({ data: [] as ToppingRow[], error: null }),
    ]);
    if (productsRes.error || toppingsRes.error) throw new Error("No se pudo leer el catálogo");
    const productMap = new Map(((productsRes.data ?? []) as ProductRow[]).map((p) => [p.id, p]));
    const toppingMap = new Map(((toppingsRes.data ?? []) as ToppingRow[]).map((t) => [t.id, t]));

    const lines = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new UserError(UNAVAILABLE, 409);
      const allowed = new Set((product.product_toppings ?? []).map((pt) => pt.topping_id));
      const toppings = Array.from(new Set(item.toppingIds)).map((id) => {
        const t = toppingMap.get(id);
        if (!t || !allowed.has(id)) throw new UserError(UNAVAILABLE, 409);
        return t;
      });
      const unitPrice = product.price + toppings.reduce((s, t) => s + t.price, 0);
      return { id: randomUUID(), product, toppings, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
    });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = 0; // Los descuentos por código se validan aquí en el servidor (siguiente etapa).
    const total = subtotal - discount;

    // ---------- 5. Fecha y hora de recogida válidas y con cupo ----------
    const days = await getAvailability(admin, settings);
    const day = days.find((d) => d.date === data.pickupDate);
    if (!day || !day.slots.some((s) => s.time === data.pickupTime)) {
      throw new UserError("Ese horario ya no está disponible. Elige otro día u hora.", 409);
    }

    // ---------- 6. Comprobante de Nequi ----------
    let receipt: { buffer: Buffer; ext: string; mime: string } | null = null;
    if (data.paymentMethod === "nequi") {
      const file = form.get("receipt");
      if (!(file instanceof File) || file.size === 0) throw new UserError("Sube la captura de tu pago por Nequi para poder verificarlo.");
      if (file.size > MAX_RECEIPT_BYTES) throw new UserError("La imagen es muy pesada. Sube una captura de máximo 4 MB.");
      const buffer = Buffer.from(await file.arrayBuffer());
      const kind = detectImage(buffer);
      if (!kind) throw new UserError("El comprobante debe ser una imagen JPG, PNG o WEBP.");
      receipt = { buffer, ...kind };
    }

    // ---------- 7. Cliente (se identifica por su celular) ----------
    const up = await admin.from("customers").upsert({ phone, name }, { onConflict: "phone", ignoreDuplicates: true });
    if (up.error) throw new Error("No se pudo registrar el cliente");
    const custRes = await admin.from("customers").select("id").eq("phone", phone).single();
    if (custRes.error || !custRes.data) throw new Error("No se pudo leer el cliente");
    const customerId = (custRes.data as { id: string }).id;

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await admin.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", customerId).gte("created_at", since);
    if ((recent.count ?? 0) >= 3) throw new UserError("Has hecho varios pedidos seguidos. Espera un momento e intenta de nuevo.", 429);

    // ---------- 8. Guardar el pedido ----------
    const orderIns = await admin
      .from("orders")
      .insert({
        customer_id: customerId,
        customer_name: name,
        customer_email: email || null,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime,
        notes: notes || null,
        subtotal,
        discount,
        total,
        payment_method: data.paymentMethod,
        payment_status: "pendiente",
        idempotency_key: data.idempotencyKey,
      })
      .select("id")
      .single();
    if (orderIns.error || !orderIns.data) throw new Error("No se pudo crear el pedido");
    createdOrderId = (orderIns.data as { id: string }).id;

    const itemsIns = await admin.from("order_items").insert(
      lines.map((l) => ({
        id: l.id,
        order_id: createdOrderId,
        product_id: l.product.id,
        product_name: l.product.name,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.lineTotal,
      })),
    );
    if (itemsIns.error) throw new Error("No se pudo guardar el detalle");

    const topRows = lines.flatMap((l) =>
      l.toppings.map((t) => ({ order_item_id: l.id, topping_id: t.id, topping_name: t.name, price: t.price })),
    );
    if (topRows.length > 0) {
      const topIns = await admin.from("order_item_toppings").insert(topRows);
      if (topIns.error) throw new Error("No se pudieron guardar los toppings");
    }

    // ---------- 9. Revisar el cupo otra vez (por si dos personas pidieron a la vez) ----------
    const slotRes = await admin
      .from("time_slots")
      .select("max_orders")
      .eq("weekday", weekdayOf(data.pickupDate))
      .eq("slot_time", data.pickupTime)
      .maybeSingle();
    const maxOrders = (slotRes.data as { max_orders: number } | null)?.max_orders ?? 0;
    const taken = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("pickup_date", data.pickupDate)
      .eq("pickup_time", data.pickupTime)
      .neq("status", "cancelado");
    if ((taken.count ?? 0) > maxOrders) throw new UserError("Ese horario se acaba de llenar. Elige otra hora.", 409);

    // ---------- 10. Subir el comprobante ----------
    if (receipt) {
      uploadedPath = `${createdOrderId}/${randomUUID()}.${receipt.ext}`;
      const up2 = await admin.storage.from("receipts").upload(uploadedPath, receipt.buffer, { contentType: receipt.mime, upsert: false });
      if (up2.error) throw new Error("No se pudo guardar el comprobante");
      const upd = await admin
        .from("orders")
        .update({ payment_receipt_path: uploadedPath, payment_status: "comprobante_recibido" })
        .eq("id", createdOrderId);
      if (upd.error) throw new Error("No se pudo registrar el comprobante");
    }

    const order = await loadOrder(admin, createdOrderId);
    finished = true;
    return NextResponse.json({ ok: true, order: toResponse(order) }, { status: 201 });
  } catch (e) {
    // Si algo falló a la mitad, no se deja un pedido a medias.
    if (!finished && admin && createdOrderId) {
      try {
        if (uploadedPath) await admin.storage.from("receipts").remove([uploadedPath]);
        await admin.from("orders").delete().eq("id", createdOrderId);
      } catch (cleanupError) {
        console.error("pedido: no se pudo limpiar", cleanupError);
      }
    }
    if (e instanceof UserError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("pedido: error", e);
    return NextResponse.json({ ok: false, error: GENERIC }, { status: 500 });
  }
}
