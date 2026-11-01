import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_SETTINGS } from "@/lib/config";
import { SEED_PRODUCTS, SEED_TOPPINGS } from "@/lib/seed-catalog";
import type { Product, SiteSettings, Topping } from "@/lib/types";

type RawTopping = { id: string; name: string; price: number; stock: number | null; in_roulette: boolean | null; sort_order: number };

type RawProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: "bowl" | "pincho";
  price: number;
  image_url: string | null;
  ingredients: string[] | null;
  stock: number | null;
  product_toppings: { toppings: RawTopping | null }[] | null;
};

export type Catalog = {
  products: Product[];
  toppings: Topping[];
  settings: SiteSettings;
  failed: boolean;
};

/** Lee el catálogo público. Si algo falla devuelve valores seguros para que la página nunca se rompa. */
export async function getCatalog(): Promise<Catalog> {
  const empty: Catalog = { products: [], toppings: [], settings: { ...DEFAULT_SETTINGS }, failed: true };
  const sb = createPublicClient();
  // Sin base de datos conectada: se muestra el menú de arranque para que el sitio ya sea usable.
  if (!sb) {
    return { products: SEED_PRODUCTS, toppings: SEED_TOPPINGS, settings: { ...DEFAULT_SETTINGS }, failed: false };
  }

  try {
    const [productsRes, toppingsRes, settingsRes] = await Promise.all([
      sb
        .from("products")
        .select(
          "id, slug, name, description, kind, price, image_url, ingredients, stock, product_toppings(toppings(id, name, price, stock, in_roulette, sort_order))",
        )
        .eq("is_active", true)
        .order("sort_order"),
      sb.from("toppings").select("id, name, price, stock, in_roulette").eq("is_active", true).order("sort_order"),
      sb.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (productsRes.error || toppingsRes.error) return empty;

    const products: Product[] = ((productsRes.data ?? []) as unknown as RawProduct[]).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      kind: p.kind,
      price: p.price,
      image_url: p.image_url,
      ingredients: p.ingredients ?? [],
      stock: p.stock ?? null,
      toppings: (p.product_toppings ?? [])
        .map((pt) => pt.toppings)
        .filter((t): t is RawTopping => t !== null)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t): Topping => ({ id: t.id, name: t.name, price: t.price, stock: t.stock ?? null, inRoulette: t.in_roulette ?? true })),
    }));

    const raw = (settingsRes.data ?? {}) as Partial<SiteSettings>;
    const settings: SiteSettings = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
      const value = raw[key];
      if (value !== undefined) (settings as Record<string, unknown>)[key] = value;
    }
    settings.logo_url = settings.logo_url ?? DEFAULT_SETTINGS.logo_url;
    const toppings: Topping[] = ((toppingsRes.data ?? []) as { id: string; name: string; price: number; stock: number | null; in_roulette: boolean | null }[]).map((t) => ({
      id: t.id,
      name: t.name,
      price: t.price,
      stock: t.stock ?? null,
      inRoulette: t.in_roulette ?? true,
    }));
    return { products, toppings, settings, failed: false };
  } catch {
    return empty;
  }
}
