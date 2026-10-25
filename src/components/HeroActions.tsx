"use client";

import { useCart } from "./CartProvider";

export function HeroActions() {
  const { count, openCart } = useCart();

  function goToMenu() {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="hero-actions">
      <button type="button" className="btn btn-primary" onClick={count > 0 ? openCart : goToMenu}>
        {count > 0 ? "Ver mi pedido" : "Pedir ahora"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={goToMenu}>
        Ver menú
      </button>
    </div>
  );
}
