import { getCatalog } from "@/lib/catalog";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { CheckoutClient } from "@/components/CheckoutClient";
import { SupportBot } from "@/components/SupportBot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finaliza tu pedido | Fruti Delicias", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const { settings } = await getCatalog();
  return (
    <CartProvider maxItems={settings.max_items_per_order}>
      <Header name={settings.business_name} logoUrl={settings.logo_url} />
      <main className="checkout-page">
        <div className="container">
          <CheckoutClient businessName={settings.business_name} logoUrl={settings.logo_url} />
        </div>
      </main>
      <CartDrawer />
      <SupportBot />
    </CartProvider>
  );
}
