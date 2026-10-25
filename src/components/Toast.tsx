"use client";

import { useCart } from "./CartProvider";

export function Toast() {
  const { toast, openCart } = useCart();
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast}>
          <span>{toast}</span>
          <button type="button" className="toast-action" onClick={openCart}>Ver pedido</button>
        </div>
      )}
    </div>
  );
}
