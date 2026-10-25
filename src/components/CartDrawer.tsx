"use client";

import { formatCOP } from "@/lib/format";
import { CHECKOUT_ENABLED } from "@/lib/config";
import { lineUnit, useCart } from "./CartProvider";
import { Modal } from "./Modal";

export function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, remove, clear, subtotal, discount, total, count, remainingCapacity } = useCart();

  return (
    <Modal open={isOpen} onClose={closeCart} label="Mi pedido" variant="drawer">
      <div className="drawer">
        <div className="drawer-head">
          <h2>Mi pedido</h2>
          <button type="button" className="icon-btn" onClick={closeCart} aria-label="Cerrar">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Aún no has agregado nada.</p>
            <button type="button" className="btn btn-primary" onClick={() => { closeCart(); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); }}>
              Ver el menú
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.key} className="cart-line">
                  <div className="cart-line-main">
                    <strong>{item.name}</strong>
                    {item.toppings.length > 0 && <p className="muted small">{item.toppings.map((t) => t.name).join(", ")}</p>}
                    <p className="muted small">{formatCOP(lineUnit(item))} c/u</p>
                  </div>
                  <div className="cart-line-side">
                    <div className="stepper stepper-sm" role="group" aria-label={`Cantidad de ${item.name}`}>
                      <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} aria-label={`Reducir ${item.name}`}>−</button>
                      <output aria-live="polite">{item.quantity}</output>
                      <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={remainingCapacity <= 0} aria-label={`Aumentar ${item.name}`}>+</button>
                    </div>
                    <span className="line-total">{formatCOP(lineUnit(item) * item.quantity)}</span>
                    <button type="button" className="link-btn" onClick={() => remove(item.key)}>Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="drawer-foot">
              <dl className="totals">
                <div><dt>Subtotal ({count} {count === 1 ? "producto" : "productos"})</dt><dd>{formatCOP(subtotal)}</dd></div>
                {discount > 0 && <div><dt>Descuento</dt><dd>−{formatCOP(discount)}</dd></div>}
                <div className="totals-final"><dt>Total</dt><dd>{formatCOP(total)}</dd></div>
              </dl>
              {CHECKOUT_ENABLED ? (
                <a className="btn btn-primary btn-block" href="/pedido">Continuar con el pedido</a>
              ) : (
                <>
                  <button type="button" className="btn btn-primary btn-block" disabled>Continuar con el pedido</button>
                  <p className="muted small center">Estamos terminando de habilitar los pedidos en línea.</p>
                </>
              )}
              <button type="button" className="link-btn center-btn" onClick={clear}>Vaciar pedido</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
