import type { Product, Topping } from "@/lib/types";

/**
 * Menú de arranque. Se usa SOLO mientras la base de datos (Supabase) no esté conectada,
 * para que la página pública ya pueda verse y probarse. Cuando se conecta Supabase,
 * el menú pasa a leerse de la base de datos y se edita desde el panel.
 */
export const SEED_TOPPINGS: Topping[] = [
  { id: "seed-capri", name: "Galletas Capri", price: 500 },
  { id: "seed-crispies", name: "Choco Crispies", price: 500 },
  { id: "seed-oreo", name: "Oreo triturada", price: 600 },
  { id: "seed-barquillos", name: "Barquillos Piazza", price: 600 },
  { id: "seed-chips-colores", name: "Chips de chocolate blanco de colores", price: 600 },
  { id: "seed-chips-semi", name: "Chips de chocolate semi amargo Corona", price: 700 },
  { id: "seed-chips", name: "Chips de chocolate", price: 800 },
  { id: "seed-salsa-extra", name: "Salsa de chocolate extra", price: 500 },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "seed-vaso-13",
    slug: "vaso-13-oz",
    name: "Vaso de 13 oz",
    description: "El grande: fruta fresca con salsa de chocolate. Agrégale los toppings que quieras.",
    kind: "bowl",
    price: 3500,
    image_url: "/img/bowl-tropical.jpg",
    ingredients: ["Fresa", "Piña", "Papaya", "Banano", "Mango", "Salsa de chocolate"],
    toppings: SEED_TOPPINGS,
  },
  {
    id: "seed-vaso-6",
    slug: "vaso-6-oz",
    name: "Vaso de 6 oz",
    description: "El pequeño: fruta fresca con salsa de chocolate, ideal para un antojo rápido.",
    kind: "bowl",
    price: 2000,
    image_url: "/img/bowl-chocolatoso.jpg",
    ingredients: ["Fresa", "Piña", "Papaya", "Banano", "Mango", "Salsa de chocolate"],
    toppings: SEED_TOPPINGS,
  },
];
