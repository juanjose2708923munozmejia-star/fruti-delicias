import { requireAdmin } from "@/lib/admin-auth";
import { CatalogManager, type ProductRow, type ToppingRow } from "@/components/CatalogManager";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const { supabase } = await requireAdmin();
  const [prods, tops] = await Promise.all([
    supabase.from("products").select("id, name, description, kind, price, image_url, ingredients, stock, is_active").order("sort_order").order("created_at"),
    supabase.from("toppings").select("id, name, price, stock, is_active, in_roulette").order("sort_order").order("created_at"),
  ]);
  const failed = Boolean(prods.error || tops.error);
  return (
    <>
      <h1>Productos e inventario</h1>
      <p className="muted">
        Agrega productos y toppings, cambia precios y controla cuántos quedan. Cuando el inventario llega a 0, el producto aparece como <strong>Agotado</strong> solo,
        y cada pedido va descontando lo que se vende. Deja el inventario vacío si no quieres límite.
      </p>
      {failed ? (
        <p className="notice" role="alert">No se pudo cargar el catálogo. Intenta recargar la página.</p>
      ) : (
        <CatalogManager products={(prods.data ?? []) as ProductRow[]} toppings={(tops.data ?? []) as ToppingRow[]} />
      )}
    </>
  );
}
