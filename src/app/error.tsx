"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container center-page">
      <h1>Lo sentimos, ocurrió un problema</h1>
      <p className="muted">Intenta nuevamente. Si el problema continúa, vuelve en unos minutos.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>Intentar de nuevo</button>
    </main>
  );
}
