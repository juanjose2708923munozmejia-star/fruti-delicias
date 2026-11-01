"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToJpeg } from "@/lib/image";
import { formatCOP } from "@/lib/format";
import { deleteProduct, deleteTopping, saveProduct, saveTopping } from "@/app/admin/productos/actions";

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  kind: "bowl" | "pincho";
  price: number;
  image_url: string | null;
  ingredients: string[] | null;
  stock: number | null;
  is_active: boolean;
};
export type ToppingRow = { id: string; name: string; price: number; stock: number | null; is_active: boolean; in_roulette: boolean };

type Note = { kind: "ok" | "error"; text: string } | null;

function parseStock(text: string): { ok: true; value: number | null } | { ok: false } {
  const t = text.trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? { ok: true, value: n } : { ok: false };
}

function stockLabel(stock: number | null): string {
  if (stock === null) return "Sin límite";
  return stock <= 0 ? "Agotado" : `Quedan ${stock}`;
}

export function CatalogManager({ products, toppings }: { products: ProductRow[]; toppings: ToppingRow[] }) {
  return (
    <div className="catalog-admin">
      <section aria-labelledby="prod-title">
        <h2 id="prod-title" className="h3">Productos</h2>
        <div className="edit-grid">
          <ProductEditor key="new-product" />
          {products.map((p) => (
            <ProductEditor key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section aria-labelledby="top-title">
        <h2 id="top-title" className="h3">Toppings</h2>
        <div className="edit-grid">
          <ToppingEditor key="new-topping" />
          {toppings.map((t) => (
            <ToppingEditor key={t.id} topping={t} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductEditor({ product }: { product?: ProductRow }) {
  const router = useRouter();
  const isNew = !product;
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [kind, setKind] = useState<"bowl" | "pincho">(product?.kind ?? "bowl");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stockText, setStockText] = useState(product?.stock == null ? "" : String(product.stock));
  const [ingredients, setIngredients] = useState((product?.ingredients ?? []).join(", "));
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [active, setActive] = useState(product?.is_active ?? true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const stockNow = parseStock(stockText);

  async function upload(file: File | null) {
    if (!file) return;
    setBusy("foto");
    setNote(null);
    try {
      const small = await resizeToJpeg(file, 1200, 0.85);
      const supabase = createClient();
      const path = `products/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("media").upload(path, small, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw up.error;
      setImageUrl(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
      setNote({ kind: "ok", text: "Foto subida. Pulsa Guardar para aplicarla." });
    } catch {
      setNote({ kind: "error", text: "No se pudo subir la foto. Prueba con otra imagen (JPG o PNG)." });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    const st = parseStock(stockText);
    const priceNum = Number(price);
    if (name.trim().length < 2) return setNote({ kind: "error", text: "Escribe el nombre del producto." });
    if (!Number.isInteger(priceNum) || priceNum < 0) return setNote({ kind: "error", text: "El precio debe ser un número entero, por ejemplo 4000." });
    if (!st.ok) return setNote({ kind: "error", text: "El inventario debe ser un número entero o quedar vacío." });
    setBusy("guardar");
    setNote(null);
    try {
      const r = await saveProduct({
        id: product?.id,
        name,
        description,
        kind,
        price: priceNum,
        imageUrl: imageUrl || null,
        ingredients: ingredients.split(",").map((s) => s.trim()).filter(Boolean),
        stock: st.value,
        isActive: active,
      });
      if (!r.ok) return setNote({ kind: "error", text: r.error });
      if (isNew) {
        setName(""); setDescription(""); setPrice(""); setStockText(""); setIngredients(""); setImageUrl(""); setActive(true);
        setNote({ kind: "ok", text: "Producto creado. Ya aparece en la página." });
      } else {
        setNote({ kind: "ok", text: "Guardado. Ya se ve en la página." });
      }
      router.refresh();
    } catch {
      setNote({ kind: "error", text: "No hubo respuesta. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!product) return;
    setBusy("borrar");
    try {
      const r = await deleteProduct(product.id);
      if (r.ok) {
        setGone(true);
        router.refresh();
      } else setNote({ kind: "error", text: r.error });
    } catch {
      setNote({ kind: "error", text: "No hubo respuesta. Inténtalo de nuevo." });
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  const soldOut = stockNow.ok && stockNow.value !== null && stockNow.value <= 0;

  return (
    <article className={`edit-card${isNew ? " is-new" : ""}`} aria-busy={busy !== null}>
      <header className="edit-head">
        <h3>{isNew ? "Nuevo producto" : product?.name}</h3>
        {!isNew && (
          <div className="order-badges">
            <span className={`badge ${soldOut ? "st-cancelado" : active ? "st-listo" : "st-entregado"}`}>{!active ? "Oculto" : soldOut ? "Agotado" : stockLabel(stockNow.ok ? stockNow.value : null)}</span>
            <button type="button" className="icon-btn icon-danger" aria-label={`Eliminar ${product?.name}`} title="Eliminar" onClick={() => setConfirmDelete((v) => !v)}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></svg>
            </button>
          </div>
        )}
      </header>

      {confirmDelete && (
        <div className="order-panel order-panel-danger" role="alertdialog" aria-label="Confirmar eliminación">
          <strong>¿Eliminar “{product?.name}”?</strong>
          <p className="small">Se borra de la página para siempre. Los pedidos que ya lo tenían conservan su detalle.</p>
          <div className="inline-form">
            <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy !== null}>{busy === "borrar" ? "Eliminando…" : "Sí, eliminar"}</button>
            <button type="button" className="link-btn" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="edit-photo">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="edit-thumb" />
        ) : (
          <span className="edit-thumb edit-thumb-empty">Sin foto</span>
        )}
        <label className="btn btn-ghost btn-sm file-btn">
          {busy === "foto" ? "Subiendo…" : imageUrl ? "Cambiar foto" : "Subir foto"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0] ?? null)} disabled={busy !== null} />
        </label>
        {imageUrl && <button type="button" className="link-btn" onClick={() => setImageUrl("")}>Quitar foto</button>}
      </div>

      <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
      <div className="two-cols">
        <label className="field"><span>Precio (COP)</span><input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="4000" /></label>
        <label className="field">
          <span>Inventario <span className="optional">(vacío = sin límite)</span></span>
          <input value={stockText} onChange={(e) => setStockText(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Sin límite" />
        </label>
      </div>
      <label className="field"><span>Descripción</span><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} /></label>
      <label className="field"><span>Ingredientes <span className="optional">(separados por comas)</span></span><input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="Fresa, Piña, Banano" /></label>
      <div className="two-cols">
        <label className="field">
          <span>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as "bowl" | "pincho")}>
            <option value="bowl">Vaso / bowl</option>
            <option value="pincho">Pincho</option>
          </select>
        </label>
        <label className="check-line"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> <span>Visible en la página</span></label>
      </div>
      {price && <p className="small muted">Se verá como {formatCOP(Number(price) || 0)}.</p>}

      <div className="inline-form">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy !== null}>{busy === "guardar" ? "Guardando…" : isNew ? "Crear producto" : "Guardar cambios"}</button>
      </div>
      <p className={`order-note${note ? ` ${note.kind}` : ""}`} role="status" aria-live="polite">{note?.text ?? ""}</p>
    </article>
  );
}

function ToppingEditor({ topping }: { topping?: ToppingRow }) {
  const router = useRouter();
  const isNew = !topping;
  const [name, setName] = useState(topping?.name ?? "");
  const [price, setPrice] = useState(topping ? String(topping.price) : "");
  const [stockText, setStockText] = useState(topping?.stock == null ? "" : String(topping.stock));
  const [active, setActive] = useState(topping?.is_active ?? true);
  const [inRoulette, setInRoulette] = useState(topping?.in_roulette ?? true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const stockNow = parseStock(stockText);
  const soldOut = stockNow.ok && stockNow.value !== null && stockNow.value <= 0;

  async function save() {
    const st = parseStock(stockText);
    const priceNum = Number(price);
    if (name.trim().length < 2) return setNote({ kind: "error", text: "Escribe el nombre del topping." });
    if (!Number.isInteger(priceNum) || priceNum < 0) return setNote({ kind: "error", text: "El precio debe ser un número entero, por ejemplo 600." });
    if (!st.ok) return setNote({ kind: "error", text: "El inventario debe ser un número entero o quedar vacío." });
    setBusy("guardar");
    setNote(null);
    try {
      const r = await saveTopping({ id: topping?.id, name, price: priceNum, stock: st.value, isActive: active, inRoulette });
      if (!r.ok) return setNote({ kind: "error", text: r.error });
      if (isNew) {
        setName(""); setPrice(""); setStockText(""); setActive(true); setInRoulette(true);
        setNote({ kind: "ok", text: "Topping creado. Ya aparece en todos los productos." });
      } else setNote({ kind: "ok", text: "Guardado. Ya se ve en la página." });
      router.refresh();
    } catch {
      setNote({ kind: "error", text: "No hubo respuesta. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!topping) return;
    setBusy("borrar");
    try {
      const r = await deleteTopping(topping.id);
      if (r.ok) {
        setGone(true);
        router.refresh();
      } else setNote({ kind: "error", text: r.error });
    } catch {
      setNote({ kind: "error", text: "No hubo respuesta. Inténtalo de nuevo." });
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  }

  return (
    <article className={`edit-card edit-card-small${isNew ? " is-new" : ""}`} aria-busy={busy !== null}>
      <header className="edit-head">
        <h3>{isNew ? "Nuevo topping" : topping?.name}</h3>
        {!isNew && (
          <div className="order-badges">
            <span className={`badge ${soldOut ? "st-cancelado" : active ? "st-listo" : "st-entregado"}`}>{!active ? "Oculto" : soldOut ? "Agotado" : stockLabel(stockNow.ok ? stockNow.value : null)}</span>
            <button type="button" className="icon-btn icon-danger" aria-label={`Eliminar ${topping?.name}`} title="Eliminar" onClick={() => setConfirmDelete((v) => !v)}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /><path d="M10 11v6M14 11v6" /></svg>
            </button>
          </div>
        )}
      </header>

      {confirmDelete && (
        <div className="order-panel order-panel-danger" role="alertdialog" aria-label="Confirmar eliminación">
          <strong>¿Eliminar “{topping?.name}”?</strong>
          <div className="inline-form">
            <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy !== null}>{busy === "borrar" ? "Eliminando…" : "Sí, eliminar"}</button>
            <button type="button" className="link-btn" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
      <div className="two-cols">
        <label className="field"><span>Precio (COP)</span><input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="600" /></label>
        <label className="field"><span>Inventario <span className="optional">(vacío = sin límite)</span></span><input value={stockText} onChange={(e) => setStockText(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Sin límite" /></label>
      </div>
      <label className="check-line"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> <span>Visible en la página</span></label>
      <label className="check-line"><input type="checkbox" checked={inRoulette} onChange={(e) => setInRoulette(e.target.checked)} /> <span>Puede salir en la ruleta de toppings</span></label>
      <div className="inline-form">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy !== null}>{busy === "guardar" ? "Guardando…" : isNew ? "Crear topping" : "Guardar cambios"}</button>
      </div>
      <p className={`order-note${note ? ` ${note.kind}` : ""}`} role="status" aria-live="polite">{note?.text ?? ""}</p>
    </article>
  );
}
