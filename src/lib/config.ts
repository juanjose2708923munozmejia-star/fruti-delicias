/**
 * Interruptor del envío de pedidos. Se pone en `true` cuando se active el flujo
 * de pedido (fecha, hora y confirmación) en la siguiente fase.
 */
export const CHECKOUT_ENABLED = false;

export const DEFAULT_SETTINGS = {
  business_name: "Fruti Delicias",
  tagline: "El antojo que combina fruta, chocolate y felicidad.",
  description:
    "Fruta + chocolate = felicidad. Bowls y pinchos de fruta fresca con chocolate y toppings, preparados por estudiantes de la Institución Educativa Sagrada Familia.",
  welcome_message: null,
  logo_url: "/img/logo.png",
  address: "Institución Educativa Sagrada Familia, Caloto, Cauca, Colombia",
  pickup_instructions: "Presenta tu número de pedido al recoger.",
  contact_phone: null,
  contact_whatsapp: null,
  contact_email: null,
  instagram_url: null,
  facebook_url: null,
  tiktok_url: null,
  orders_enabled: true,
  max_items_per_order: 20,
} as const;
