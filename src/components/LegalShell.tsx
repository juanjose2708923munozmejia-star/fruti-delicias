import Link from "next/link";
import { Logo } from "./Logo";

export function LegalShell({
  name,
  logoUrl,
  title,
  updated,
  children,
}: {
  name: string;
  logoUrl: string | null;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="legal-top">
        <div className="container legal-top-inner">
          <Link href="/" className="logo-link" aria-label={`${name}, volver al inicio`}>
            <Logo name={name} logoUrl={logoUrl} />
          </Link>
          <Link href="/" className="btn btn-mango btn-sm">Volver a la página</Link>
        </div>
      </header>
      <main className="legal-page">
        <article className="container legal-body">
          <h1>{title}</h1>
          <p className="muted">Última actualización: {updated}</p>
          {children}
        </article>
      </main>
    </>
  );
}
