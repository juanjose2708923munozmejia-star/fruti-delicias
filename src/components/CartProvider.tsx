"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CartItem, Topping } from "@/lib/types";

const STORAGE_KEY = "bp-cart-v1";

type State = { items: CartItem[]; hydrated: boolean };
type Action =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: CartItem }
  | { type: "qty"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { items: action.items, hydrated: true };
    case "add": {
      const existing = state.items.find((i) => i.key === action.item.key);
      const items = existing
        ? state.items.map((i) => (i.key === existing.key ? { ...i, quantity: i.quantity + action.item.quantity } : i))
        : [...state.items, action.item];
      return { ...state, items };
    }
    case "qty":
      return {
        ...state,
        items: state.items.map((i) => (i.key === action.key ? { ...i, quantity: action.quantity } : i)),
      };
    case "remove":
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case "clear":
      return { ...state, items: [] };
  }
}

/** Valida lo guardado en el dispositivo: nunca se confía en ello (el servidor recalcula todo al pedir). */
function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CartItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.key !== "string" || typeof o.productId !== "string" || typeof o.name !== "string") continue;
    const unitPrice = Number(o.unitPrice);
    const quantity = Math.floor(Number(o.quantity));
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(quantity) || quantity < 1 || quantity > 50) continue;
    const toppings: Topping[] = Array.isArray(o.toppings)
      ? (o.toppings as unknown[]).flatMap((t) => {
          const x = t as Record<string, unknown>;
          return typeof x?.id === "string" && typeof x?.name === "string" && Number.isFinite(Number(x?.price))
            ? [{ id: x.id, name: x.name, price: Number(x.price) }]
            : [];
        })
      : [];
    out.push({
      key: o.key,
      productId: o.productId,
      name: o.name,
      image: typeof o.image === "string" ? o.image : null,
      unitPrice,
      quantity,
      toppings,
    });
  }
  return out;
}

export function lineUnit(item: CartItem): number {
  return item.unitPrice + item.toppings.reduce((sum, t) => sum + t.price, 0);
}

type AddInput = { productId: string; name: string; image: string | null; unitPrice: number; toppings: Topping[]; quantity: number };

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  maxItems: number;
  remainingCapacity: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (input: AddInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  toast: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

export function CartProvider({ children, maxItems }: { children: React.ReactNode; maxItems: number }) {
  const [state, dispatch] = useReducer(reducer, { items: [], hydrated: false });
  const [isOpen, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar el carrito guardado en este dispositivo.
  useEffect(() => {
    let items: CartItem[] = [];
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) items = sanitize(JSON.parse(saved));
    } catch {
      items = [];
    }
    dispatch({ type: "hydrate", items });
  }, []);

  // Guardar cambios (solo después de haber cargado, para no borrar lo guardado).
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Almacenamiento no disponible (modo privado): el carrito sigue funcionando en memoria.
    }
  }, [state.items, state.hydrated]);

  const count = useMemo(() => state.items.reduce((n, i) => n + i.quantity, 0), [state.items]);
  const subtotal = useMemo(() => state.items.reduce((sum, i) => sum + lineUnit(i) * i.quantity, 0), [state.items]);
  const discount = 0; // Los descuentos se validan en el servidor al confirmar el pedido.

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const add = useCallback(
    (input: AddInput) => {
      const toppings = [...input.toppings].sort((a, b) => a.id.localeCompare(b.id));
      const key = `${input.productId}:${toppings.map((t) => t.id).join(",")}`;
      dispatch({
        type: "add",
        item: {
          key,
          productId: input.productId,
          name: input.name,
          image: input.image,
          unitPrice: input.unitPrice,
          toppings,
          quantity: input.quantity,
        },
      });
      showToast(`${input.name} agregado al pedido`);
    },
    [showToast],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      hydrated: state.hydrated,
      count,
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      maxItems,
      remainingCapacity: Math.max(0, maxItems - count),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      add,
      setQuantity: (key, quantity) => {
        if (quantity < 1) return dispatch({ type: "remove", key });
        const current = state.items.find((i) => i.key === key);
        const others = count - (current?.quantity ?? 0);
        dispatch({ type: "qty", key, quantity: Math.min(quantity, Math.max(1, maxItems - others)) });
      },
      remove: (key) => dispatch({ type: "remove", key }),
      clear: () => dispatch({ type: "clear" }),
      toast,
    }),
    [state.items, state.hydrated, count, subtotal, maxItems, isOpen, add, toast],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
