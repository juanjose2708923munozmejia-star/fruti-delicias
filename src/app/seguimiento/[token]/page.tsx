import { TrackingClient } from "@/components/TrackingClient";
import { getCatalog } from "@/lib/catalog";
import { Header } from "@/components/Header";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de tu pedido | Fruti Delicias", robots: { index: false, follow: false } };

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { settings } = await getCatalog();
  return (
    <CartProvider maxItems={settings.max_items_per_order}>
      <Header name={settings.business_name} logoUrl={settings.logo_url} />
      <main className="checkout-page">
        <div className="container">
          <TrackingClient token={token} whatsapp={settings.contact_whatsapp} />
        </div>
      </main>
      <CartDrawer />
    </CartProvider>
  );
}
