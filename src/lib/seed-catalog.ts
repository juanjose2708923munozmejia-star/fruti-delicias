import type { Product, Topping } from "@/lib/types";

/**
 * Menú de arranque. Se usa SOLO mientras la base de datos (Supabase) no esté conectada,
 * para que la página pública ya pueda verse y probarse. Cuando se conecta Supabase,
 * el menú pasa a leerse de la base de datos y se edita desde el panel.
 */
export const SEED_TOPPINGS: Topping[] = [
  { id: "seed-marshmallow", name: "Marshmallow", price: 1500 },
  { id: "seed-brownie", name: "Brownie", price: 2000 },
  { id: "seed-chocoramo", name: "Chocoramo", price: 2500 },
  { id: "seed-barquillo", name: "Barquillo", price: 1500 },
  { id: "seed-chocolate-extra", name: "Chocolate extra", price: 2000 },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "seed-bowl-tropical",
    slug: "bowl-tropical",
    name: "Bowl Tropical",
    description: "Mango, banano, fresa y piña frescos con salsa de chocolate.",
    kind: "bowl",
    price: 5000,
    image_url: "/img/bowl-tropical.jpg",
    ingredients: ["Mango", "Banano", "Fresa", "Piña", "Salsa de chocolate"],
    toppings: SEED_TOPPINGS,
  },
  {
    id: "seed-bowl-chocolatoso",
    slug: "bowl-chocolatoso",
    name: "Bowl Chocolatoso",
    description: "Frutas frescas bañadas en chocolate derretido con toppings a tu gusto.",
    kind: "bowl",
    price: 5000,
    image_url: "/img/bowl-chocolatoso.jpg",
    ingredients: ["Mango", "Banano", "Fresa", "Piña", "Chocolate derretido", "Marshmallows"],
    toppings: SEED_TOPPINGS,
  },
];
