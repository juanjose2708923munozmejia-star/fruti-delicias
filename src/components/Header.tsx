import Link from "next/link";
import { Logo } from "./Logo";
import { CartButton } from "./CartButton";

export function Header({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo-link">
          <Logo name={name} logoUrl={logoUrl} />
        </Link>
        <nav className="main-nav" aria-label="Principal">
          <a href="/#menu">Menú</a>
          <a href="/#toppings">Toppings</a>
          <a href="/#nosotros">Nosotros</a>
        </nav>
        <div className="header-actions">
          <CartButton />
          <Link href="/acceso" className="btn btn-mango btn-sm">
            Acceder
          </Link>
        </div>
      </div>
      <div className="header-drip" aria-hidden="true" />
    </header>
  );
}
