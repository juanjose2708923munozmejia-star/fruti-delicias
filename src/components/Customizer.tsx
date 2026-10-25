"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { useCart } from "./CartProvider";
import { Modal } from "./Modal";

export function Customizer({ product, onClose }: { product: Product | null; onClose: () => void }) {
  return (
    <Modal open={product !== null} onClose={onClose} label={product ? `Personalizar ${product.name}` : "Personalizar"} variant="sheet">
      {product && <CustomizerBody key={product.id} product={product} onClose={onClose} />}
    </Modal>
  );
}

function CustomizerBody({ product, onClose }: { product: Product; onClose: () => void }) {
  const { add, remainingCapacity, maxItems } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  const chosen = useMemo(() => product.toppings.filter((t) => selected.has(t.id)), [product.toppings, selected]);
  const unit = product.price + chosen.reduce((sum, t) => sum + t.price, 0);
  const limit = Math.max(0, Math.min(50, remainingCapacity));
  const full = remainingCapacity <= 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (full) return;
    add({
      productId: product.id,
      name: product.name,
      image: product.image_url,
      unitPrice: product.price,
      toppings: chosen,
      quantity: Math.min(quantity, limit),
    });
    onClose();
  }

  return (
    <div className="customizer">
      <div className="customizer-head">
        {product.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="customizer-img" width={88} height={88} />
        )}
        <div>
          <h2 className="customizer-title">{product.name}</h2>
          <p className="muted">Base {formatCOP(product.price)}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {product.toppings.length > 0 ? (
        <fieldset className="toppings-fieldset">
          <legend>Elige tus toppings</legend>
          {product.toppings.map((t) => (
            <label key={t.id} className={`topping-option${selected.has(t.id) ? " is-on" : ""}`}>
              <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} />
              <span className="topping-name">{t.name}</span>
              <span className="topping-price">+{formatCOP(t.price)}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="muted">Este producto no tiene toppings adicionales.</p>
      )}

      <div className="qty-row">
        <span id="qty-label">Cantidad</span>
        <div className="stepper" role="group" aria-labelledby="qty-label">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Reducir cantidad">
            −
          </button>
          <output aria-live="polite">{Math.min(quantity, Math.max(1, limit))}</output>
          <button type="button" onClick={() => setQuantity((q) => Math.min(Math.max(1, limit), q + 1))} disabled={quantity >= limit} aria-label="Aumentar cantidad">
            +
          </button>
        </div>
      </div>

      {full && <p className="notice" role="alert">Tu pedido ya tiene el máximo de {maxItems} productos.</p>}

      <div className="customizer-foot">
        <div>
          <span className="muted">Total</span>
          <strong className="foot-total">{formatCOP(unit * Math.min(quantity, Math.max(1, limit)))}</strong>
        </div>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={full}>
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}
