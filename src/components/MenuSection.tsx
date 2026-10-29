"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { Customizer } from "./Customizer";

type Filter = "todos" | "bowl" | "pincho";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "bowl", label: "Bowls" },
  { id: "pincho", label: "Pinchos" },
];

export function MenuSection({ products, failed, ordersEnabled }: { products: Product[]; failed: boolean; ordersEnabled: boolean }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [selected, setSelected] = useState<Product | null>(null);
  const visible = products.filter((p) => filter === "todos" || p.kind === filter);
  const showFilters = new Set(products.map((p) => p.kind)).size > 1;

  return (
    <section id="menu" className="section section-menu" aria-labelledby="menu-title">
      <div className="container">
        <div className="section-head">
          <h2 id="menu-title">Nuestro menú</h2>
          <p className="muted lead">Elige tu favorito, añade los toppings que quieras y agrégalo a tu pedido.</p>
        </div>

        {showFilters && (
          <div className="filters" role="group" aria-label="Filtrar productos">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="chip-btn" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {products.length === 0 ? (
          <p className="empty">
            {failed
              ? "El menú no está disponible en este momento. Intenta nuevamente en unos minutos."
              : "Estamos preparando el menú. Vuelve pronto."}
          </p>
        ) : (
          <ul className="product-grid">
            {visible.map((p) => (
              <li key={p.id} className={`product-card kind-${p.kind}`}>
                <div className="product-art">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={`${p.name}`} width={600} height={600} loading="lazy" />
                  ) : (
                    <span className="art-fallback">
                      <span className="art-emoji" aria-hidden="true">{p.kind === "bowl" ? "🥣" : "🍡"}</span>
                      <span className="art-note">Foto próximamente</span>
                    </span>
                  )}
                  <span className="kind-tag">{p.kind === "bowl" ? "Bowl" : "Pincho"}</span>
                </div>
                <div className="product-info">
                  <h3>{p.name}</h3>
                  {p.description && <p className="product-desc">{p.description}</p>}
                  {p.ingredients.length > 0 && (
                    <ul className="ingredients" aria-label={`Ingredientes de ${p.name}`}>
                      {p.ingredients.map((ing) => (
                        <li key={ing}>{ing}</li>
                      ))}
                    </ul>
                  )}
                  <div className="product-foot">
                    <span className="price">{formatCOP(p.price)}</span>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelected(p)} disabled={!ordersEnabled}>
                      Agregar al pedido
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!ordersEnabled && products.length > 0 && (
          <p className="notice">Por ahora no estamos recibiendo pedidos. Puedes ver el menú y volver pronto.</p>
        )}
      </div>
      <Customizer product={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
