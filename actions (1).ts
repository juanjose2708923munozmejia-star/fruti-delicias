"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import type { ActionResult } from "@/lib/action-result";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };
const FAIL = { ok: false as const, error: "No se pudo guardar. Intenta de nuevo." };
const BAD = { ok: false as const, error: "Revisa los datos: el nombre y el precio son obligatorios y deben ser válidos." };

const stock = z.number().int().min(0).max(100000).nullable();
const image = z
  .string()
  .max(500)
  .nullable()
  .refine((v) => v === null || v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Imagen no válida");

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  kind: z.enum(["bowl", "pincho"]),
  price: z.number().int().min(0).max(1000000),
  imageUrl: image,
  ingredients: z.array(z.string().trim().min(1).max(40)).max(20),
  stock,
  isActive: z.boolean(),
});

const toppingSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  price: z.number().int().min(0).max(100000),
  stock,
  isActive: z.boolean(),
  inRoulette: z.boolean(),
});

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "producto"
  );
}

/** Crea o actualiza un producto. Un producto nuevo recibe automáticamente todos los toppings. */
export async function saveProduct(input: unknown): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return BAD;
  const p = parsed.data;
  const row = {
    name: p.name,
    description: p.description || null,
    kind: p.kind,
    price: p.price,
    image_url: p.imageUrl || null,
    ingredients: p.ingredients,
    stock: p.stock,
    is_active: p.isActive,
  };
  if (p.id) {
    const { error } = await supabase.from("products").update(row).eq("id", p.id);
    return error ? FAIL : { ok: true, id: p.id };
  }
  const slug = `${slugify(p.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase.from("products").insert({ ...row, slug, sort_order: 50 }).select("id").single();
  if (error || !data) return FAIL;
  const id = (data as { id: string }).id;
  const tops = await supabase.from("toppings").select("id");
  const list = (tops.data ?? []) as { id: string }[];
  if (list.length > 0) await supabase.from("product_toppings").insert(list.map((t) => ({ product_id: id, topping_id: t.id })));
  return { ok: true, id };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return FAIL;
  const { error } = await supabase.from("products").delete().eq("id", id);
  return error ? FAIL : { ok: true };
}

/** Crea o actualiza un topping. Uno nuevo se agrega solo a todos los productos. */
export async function saveTopping(input: unknown): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const parsed = toppingSchema.safeParse(input);
  if (!parsed.success) return BAD;
  const t = parsed.data;
  const row = { name: t.name, price: t.price, stock: t.stock, is_active: t.isActive, in_roulette: t.inRoulette };
  if (t.id) {
    const { error } = await supabase.from("toppings").update(row).eq("id", t.id);
    return error ? FAIL : { ok: true, id: t.id };
  }
  const { data, error } = await supabase.from("toppings").insert({ ...row, sort_order: 50 }).select("id").single();
  if (error || !data) return FAIL;
  const id = (data as { id: string }).id;
  const prods = await supabase.from("products").select("id");
  const list = (prods.data ?? []) as { id: string }[];
  if (list.length > 0) await supabase.from("product_toppings").insert(list.map((p) => ({ product_id: p.id, topping_id: id })));
  return { ok: true, id };
}

export async function deleteTopping(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return FAIL;
  const { error } = await supabase.from("toppings").delete().eq("id", id);
  return error ? FAIL : { ok: true };
}
