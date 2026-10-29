/**
 * Interruptor del envío de pedidos. Se pone en `true` cuando se active el flujo
 * de pedido (fecha, hora y confirmación) en la siguiente fase.
 */
export const CHECKOUT_ENABLED = true;

export const DEFAULT_SETTINGS = {
  business_name: "Fruti Delicias",
  tagline: "El antojo que combina fruta, chocolate y felicidad.",
  description:
    "Fruta + chocolate = felicidad. Bowls de fruta fresca con chocolate y toppings, preparados por estudiantes de la Institución Educativa Sagrada Familia.",
  welcome_message: null,
  logo_url: "/img/logo.png",
  address: "Institución Educativa Sagrada Familia, Caloto, Cauca, Colombia",
  pickup_instructions: "Presenta tu número de pedido al recoger.",
  contact_phone: "3207186351",
  contact_whatsapp: "3207186351",
  contact_email: "juanjose2708923munozmejia@gmail.com",
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  orders_enabled: true,
  max_items_per_order: 20,
} as const;
