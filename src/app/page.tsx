import { getCatalog } from "@/lib/catalog";
import { formatCOP } from "@/lib/format";
import { CartProvider } from "@/components/CartProvider";
import { CartDrawer } from "@/components/CartDrawer";
import { Toast } from "@/components/Toast";
import { Header } from "@/components/Header";
import { HeroActions } from "@/components/HeroActions";
import { MenuSection } from "@/components/MenuSection";
import { Logo } from "@/components/Logo";

// El menú y los precios los edita el administrador: siempre se leen actualizados.
export const dynamic = "force-dynamic";

const FRUITS = [
  { name: "Mango", color: "#FFA62B" },
  { name: "Banano", color: "#FFE27A" },
  { name: "Fresa", color: "#E23A5B" },
  { name: "Piña", color: "#F7DA4D" },
];

export default async function HomePage() {
  const { products, toppings, settings, failed } = await getCatalog();
  const mapsUrl = settings.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
    : null;
  const whatsappDigits = settings.contact_whatsapp?.replace(/\D/g, "");

  return (
    <CartProvider maxItems={settings.max_items_per_order}>
      <Header name={settings.business_name} logoUrl={settings.logo_url} />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="container hero-inner">
            <div className="hero-copy">
              <h1 id="hero-title">{settings.tagline ?? "El antojo que combina fruta, chocolate y felicidad."}</h1>
              <p className="lead">
                Bowls y pinchos de fruta fresca con chocolate y toppings. Arma el tuyo, resérvalo y recógelo en el colegio.
              </p>
              <HeroActions />
              <ul className="hero-facts">
                <li>Sin crear cuenta</li>
                <li>Recoges en el colegio</li>
                <li>Pagas al recoger</li>
              </ul>
            </div>
            <div className="hero-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/hero-bowl.jpg" alt="Bowl de fruta fresca con chocolate en vaso Fruti Delicias" width={602} height={795} fetchPriority="high" />
            </div>
          </div>
        </section>

        <MenuSection products={products} failed={failed} ordersEnabled={settings.orders_enabled} />

        <section id="toppings" className="section section-dark" aria-labelledby="toppings-title">
          <div className="container">
            <div className="section-head">
              <h2 id="toppings-title">Fruta fresca y toppings a tu gusto</h2>
              <p className="lead on-dark">Empieza con fruta y termina con el toque de chocolate que más te guste.</p>
            </div>
            <ul className="fruit-row" aria-label="Frutas">
              {FRUITS.map((f) => (
                <li key={f.name}>
                  <span className="fruit-dot" style={{ background: f.color }} aria-hidden="true" />
                  {f.name}
                </li>
              ))}
            </ul>
            {toppings.length > 0 && (
              <ul className="topping-list" aria-label="Toppings disponibles">
                {toppings.map((t) => (
                  <li key={t.id}>
                    <span>{t.name}</span>
                    <span className="topping-list-price">+{formatCOP(t.price)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section id="nosotros" className="section section-about" aria-labelledby="about-title">
          <div className="container about-grid">
            <figure className="about-poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/poster-marca.jpg" alt="Póster de Fruti Delicias: bowls de frutas con chocolate" width={760} height={1140} loading="lazy" />
            </figure>
            <div className="about-main">
              <h2 id="about-title">Hecho por estudiantes, con ganas</h2>
              <p className="lead">{settings.description}</p>
              {settings.welcome_message && <p>{settings.welcome_message}</p>}
            </div>
            <div className="info-card about-card">
              <h3>Dónde recoger tu pedido</h3>
              {settings.address && <p>{settings.address}</p>}
              {settings.pickup_instructions && <p className="muted">{settings.pickup_instructions}</p>}
              <ul className="info-links">
                {mapsUrl && (
                  <li>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
                  </li>
                )}
                {whatsappDigits && (
                  <li>
                    <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
                  </li>
                )}
                {settings.contact_phone && (
                  <li>
                    <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, "")}`}>Llamar al {settings.contact_phone}</a>
                  </li>
                )}
                {settings.contact_email && (
                  <li>
                    <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                  </li>
                )}
                {settings.instagram_url && (
                  <li>
                    <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a>
                  </li>
                )}
                {settings.facebook_url && (
                  <li>
                    <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">Facebook</a>
                  </li>
                )}
                {settings.tiktok_url && (
                  <li>
                    <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer">TikTok</a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <Logo name={settings.business_name} logoUrl={settings.logo_url} />
          <p className="small">Fruta + chocolate = felicidad. Institución Educativa Sagrada Familia, Caloto, Cauca.</p>
        </div>
      </footer>

      <CartDrawer />
      <Toast />
    </CartProvider>
  );
}
