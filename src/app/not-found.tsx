import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container center-page">
      <h1>No encontramos esta página</h1>
      <p className="muted">Puede que el enlace haya cambiado.</p>
      <Link href="/" className="btn btn-primary">Volver al inicio</Link>
    </main>
  );
}
