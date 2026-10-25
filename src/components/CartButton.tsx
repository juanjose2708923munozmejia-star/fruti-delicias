"use client";

import { useCart } from "./CartProvider";

export function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button type="button" className="cart-btn" onClick={openCart} aria-label={`Abrir mi pedido, ${count} ${count === 1 ? "producto" : "productos"}`}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      <span className="cart-label">Mi pedido</span>
      {count > 0 && (
        <span className="cart-badge" key={count} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
