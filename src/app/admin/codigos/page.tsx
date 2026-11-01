import { requireAdmin } from "@/lib/admin-auth";
import { PromoManager, type PromoRow } from "@/components/PromoManager";

export const dynamic = "force-dynamic";

export default async function PromoAdminPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("id, code, description, discount_percent, discount_amount, max_uses, used_count, one_per_phone, expires_at, is_active, created_at")
    .order("created_at", { ascending: false });
  return (
    <>
      <h1>Códigos de descuento</h1>
      <p className="muted">
        Crea códigos como <strong>JL50</strong> para tus clientes frecuentes. El cliente lo escribe al finalizar su pedido, y el servidor revisa que sea válido,
        que no esté vencido ni agotado, y que ese celular no lo haya usado antes.
      </p>
      {error ? (
        <p className="notice" role="alert">No se pudieron cargar los códigos. Intenta recargar la página.</p>
      ) : (
        <PromoManager codes={(data ?? []) as PromoRow[]} />
      )}
    </>
  );
}
