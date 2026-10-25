export type Topping = { id: string; name: string; price: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: "bowl" | "pincho";
  price: number;
  image_url: string | null;
  ingredients: string[];
  toppings: Topping[];
};

export type SiteSettings = {
  business_name: string;
  tagline: string | null;
  description: string | null;
  welcome_message: string | null;
  logo_url: string | null;
  address: string | null;
  pickup_instructions: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  orders_enabled: boolean;
  max_items_per_order: number;
};

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  toppings: Topping[];
};
