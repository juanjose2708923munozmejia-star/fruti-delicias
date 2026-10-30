"use client";

import { useCart } from "./CartProvider";

export function HeroActions({ closed = false }: { closed?: boolean }) {
  const { count, openCart } = useCart();

  function goToMenu() {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="hero-actions">
      {!closed && (
        <button type="button" className="btn btn-primary" onClick={count > 0 ? openCart : goToMenu}>
          {count > 0 ? "Ver mi pedido" : "Pedir ahora"}
        </button>
      )}
      <button type="button" className={closed ? "btn btn-primary" : "btn btn-ghost"} onClick={goToMenu}>
        Ver menú
      </button>
    </div>
  );
}
