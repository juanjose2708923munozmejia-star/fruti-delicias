-- =====================================================================
-- Bowls & Pinchos · Esquema de base de datos (Supabase / PostgreSQL)
-- Institución Educativa Sagrada Familia · Caloto, Cauca
--
-- CÓMO USAR: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Ejecutar UNA sola vez en un proyecto nuevo (si lo repites dará
-- errores de "already exists"; para reiniciar, crea un proyecto nuevo).
--
-- Todos los precios son enteros en pesos colombianos (COP), sin decimales.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------
create type product_kind  as enum ('bowl', 'pincho');
create type order_status  as enum ('nuevo', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado');
create type prize_type    as enum ('descuento_porcentaje', 'topping_gratis', 'chocolate_extra', 'bowl_gratis', 'pincho_gratis', 'sorpresa');
create type spin_status   as enum ('disponible', 'usada');
create type coupon_status as enum ('disponible', 'utilizado', 'expirado');

-- ---------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. TABLAS
-- ---------------------------------------------------------------------

-- Administradores (enlazados a Supabase Auth: la contraseña NUNCA se guarda aquí)
create table public.admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;

-- Configuración general (una sola fila, id = 1)
create table public.settings (
  id                   smallint primary key default 1 check (id = 1),
  business_name        text not null default 'Bowls & Pinchos',
  tagline              text default 'El antojo que combina fruta, chocolate y felicidad.',
  description          text,
  welcome_message      text default '¡Bienvenido! Arma tu bowl o pincho favorito y recógelo en el colegio.',
  logo_url             text,
  public_url           text not null default 'http://localhost:3000',
  address              text default 'Institución Educativa Sagrada Familia, Caloto, Cauca, Colombia',
  pickup_instructions  text default 'Presenta tu número de pedido al recoger. El pago se realiza al recibir.',
  contact_phone        text,
  contact_whatsapp     text,
  contact_email        text,
  instagram_url        text,
  facebook_url         text,
  tiktok_url           text,
  orders_enabled       boolean not null default true,
  max_items_per_order  int not null default 20  check (max_items_per_order > 0),
  min_lead_minutes     int not null default 60  check (min_lead_minutes >= 0),
  max_days_ahead       int not null default 14  check (max_days_ahead > 0),
  rewards_enabled      boolean not null default true,
  purchases_for_spin   int not null default 5   check (purchases_for_spin > 0),
  coupon_valid_days    int not null default 30  check (coupon_valid_days > 0),
  updated_at           timestamptz not null default now()
);
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- Clientes (sin cuenta). El teléfono identifica compras repetidas para
-- recompensas. Nunca se expone públicamente: solo el servidor y el admin lo leen.
create table public.customers (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  name       text,
  created_at timestamptz not null default now()
);

-- Productos
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  kind        product_kind not null,
  price       int not null check (price >= 0),
  image_url   text,
  ingredients text[] not null default '{}',
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- Toppings
create table public.toppings (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  price      int not null check (price >= 0),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_toppings_updated before update on public.toppings
  for each row execute function public.set_updated_at();

-- Qué toppings admite cada producto
create table public.product_toppings (
  product_id uuid not null references public.products(id) on delete cascade,
  topping_id uuid not null references public.toppings(id) on delete cascade,
  primary key (product_id, topping_id)
);

-- Franjas horarias de recogida (weekday: 0 = domingo ... 6 = sábado)
create table public.time_slots (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),
  slot_time  time not null,
  max_orders int not null default 8 check (max_orders > 0),
  is_active  boolean not null default true,
  unique (weekday, slot_time)
);

-- Fechas no disponibles (festivos, eventos, etc.)
create table public.blocked_dates (
  day    date primary key,
  reason text
);

-- Premios de la ruleta. Probabilidad = weight / suma de weights activos.
-- stock NULL = ilimitado.
create table public.prizes (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  emoji            text,
  kind             prize_type not null,
  discount_percent int check (discount_percent between 1 and 100),
  weight           int not null default 1 check (weight >= 0),
  stock            int check (stock >= 0),
  is_active        boolean not null default true,
  sort_order       int not null default 0
);

-- Pedidos
create sequence public.order_number_seq start 1;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    bigint not null unique default nextval('public.order_number_seq'),
  customer_id     uuid not null references public.customers(id),
  customer_name   text,
  pickup_date     date not null,
  pickup_time     time not null,
  notes           text check (char_length(notes) <= 500),
  subtotal        int not null check (subtotal >= 0),
  discount        int not null default 0 check (discount >= 0),
  total           int not null check (total >= 0),
  status          order_status not null default 'nuevo',
  coupon_id       uuid,
  review_token    uuid not null unique default gen_random_uuid(),
  idempotency_key text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (discount <= subtotal)
);
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- Detalle del pedido: guarda el precio y nombre del momento de la compra
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price   int not null check (unit_price >= 0),
  quantity     int not null check (quantity between 1 and 50),
  line_total   int not null check (line_total >= 0)
);

create table public.order_item_toppings (
  id            uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  topping_id    uuid references public.toppings(id) on delete set null,
  topping_name  text not null,
  price         int not null check (price >= 0)
);

-- Historial de cambios de estado
create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  changed_by  uuid,
  created_at  timestamptz not null default now()
);

-- Reseñas (una por pedido; permite medias estrellas: 0.5, 1.0, ... 5.0)
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  rating      numeric(2,1) not null
              check (rating >= 0.5 and rating <= 5 and (rating * 2) = trunc(rating * 2)),
  comment     text check (char_length(comment) <= 1000),
  is_visible  boolean not null default true,
  is_featured boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Oportunidades de ruleta (se crean solas al entregar la compra N)
create table public.spins (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers(id),
  earned_by_order_id uuid not null unique references public.orders(id) on delete cascade,
  status            spin_status not null default 'disponible',
  prize_id          uuid references public.prizes(id) on delete set null,
  earned_at         timestamptz not null default now(),
  used_at           timestamptz
);

-- Cupones (códigos tipo BOWL-7K92)
create table public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  prize_id         uuid references public.prizes(id) on delete set null,
  customer_id      uuid references public.customers(id),
  spin_id          uuid unique references public.spins(id) on delete set null,
  status           coupon_status not null default 'disponible',
  expires_at       timestamptz not null,
  used_at          timestamptz,
  used_in_order_id uuid references public.orders(id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table public.orders
  add constraint orders_coupon_fk foreign key (coupon_id) references public.coupons(id) on delete set null;

-- ---------------------------------------------------------------------
-- 4. ÍNDICES
-- ---------------------------------------------------------------------
create index idx_orders_pickup   on public.orders (pickup_date, pickup_time);
create index idx_orders_status   on public.orders (status);
create index idx_orders_customer on public.orders (customer_id);
create index idx_orders_created  on public.orders (created_at desc);
create index idx_items_order     on public.order_items (order_id);
create index idx_item_tops_item  on public.order_item_toppings (order_item_id);
create index idx_history_order   on public.order_status_history (order_id);
create index idx_reviews_visible on public.reviews (is_visible, is_featured);
create index idx_spins_customer  on public.spins (customer_id, status);
create index idx_coupons_status  on public.coupons (status, expires_at);

-- ---------------------------------------------------------------------
-- 5. TRIGGERS DE NEGOCIO
-- ---------------------------------------------------------------------

-- Historial automático de estados
create or replace function public.log_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger trg_orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- Otorga una oportunidad de ruleta cada N pedidos ENTREGADOS del mismo cliente.
-- Solo cuentan pedidos entregados para evitar pedidos falsos que inflen premios.
create or replace function public.award_spin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_enabled   boolean;
  v_n         int;
  v_delivered int;
begin
  if new.status = 'entregado' and old.status is distinct from 'entregado' then
    select rewards_enabled, purchases_for_spin into v_enabled, v_n
      from public.settings where id = 1;
    if v_enabled and v_n > 0 then
      select count(*) into v_delivered
        from public.orders
       where customer_id = new.customer_id and status = 'entregado';
      if v_delivered % v_n = 0 then
        insert into public.spins (customer_id, earned_by_order_id)
        values (new.customer_id, new.id)
        on conflict (earned_by_order_id) do nothing;
      end if;
    end if;
  end if;
  return new;
end $$;

create trigger trg_orders_award_spin
  after update of status on public.orders
  for each row execute function public.award_spin();

-- ---------------------------------------------------------------------
-- 6. SEGURIDAD (Row Level Security)
-- El servidor usa la clave de servicio (que ignora RLS) SOLO en el backend.
-- Con RLS activo, desde el navegador (clave pública) solo se puede LEER el
-- catálogo público. Nada se puede escribir ni leer de pedidos, clientes,
-- cupones o reseñas sin pasar por el servidor.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'admins','settings','customers','products','toppings','product_toppings',
    'time_slots','blocked_dates','prizes','orders','order_items',
    'order_item_toppings','order_status_history','reviews','spins','coupons'
  ]) loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin_all" on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Lectura pública solo del catálogo y la configuración visible
create policy "public_read" on public.products         for select to anon, authenticated using (is_active);
create policy "public_read" on public.toppings         for select to anon, authenticated using (is_active);
create policy "public_read" on public.product_toppings for select to anon, authenticated using (true);
create policy "public_read" on public.settings         for select to anon, authenticated using (true);
create policy "public_read" on public.time_slots       for select to anon, authenticated using (is_active);
create policy "public_read" on public.blocked_dates    for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- 7. ALMACENAMIENTO DE IMÁGENES (logo y fotos de productos)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

-- ---------------------------------------------------------------------
-- 8. DATOS DE PRUEBA (todo editable luego desde el panel)
-- ---------------------------------------------------------------------
insert into public.settings (id, description) values
  (1, 'Bowls y pinchos de fruta fresca con chocolate y toppings, preparados por estudiantes de la Institución Educativa Sagrada Familia.');

insert into public.products (slug, name, description, kind, price, image_url, ingredients, sort_order) values
  ('bowl-tropical',    'Bowl Tropical',    'Mango, banano, fresa y piña frescos con salsa de chocolate.',            'bowl',   12000, '/img/bowl-tropical.svg',    array['Mango','Banano','Fresa','Piña','Salsa de chocolate'], 1),
  ('bowl-chocolatoso', 'Bowl Chocolatoso', 'Frutas frescas bañadas en chocolate derretido con toppings a tu gusto.', 'bowl',   15000, '/img/bowl-chocolatoso.svg', array['Mango','Banano','Fresa','Piña','Chocolate derretido','Marshmallows'], 2),
  ('pincho-frutal',    'Pincho Frutal',    'Combinación de frutas frescas en palito con salsa de chocolate.',         'pincho',  8000, '/img/pincho-frutal.svg',    array['Mango','Banano','Fresa','Piña','Salsa de chocolate'], 3),
  ('pincho-chocomix',  'Pincho ChocoMix',  'Frutas bañadas en chocolate con trocitos de brownie y barquillo.',        'pincho', 10000, '/img/pincho-chocomix.svg',  array['Banano','Fresa','Chocolate derretido','Brownie','Barquillo'], 4);

insert into public.toppings (name, price, sort_order) values
  ('Marshmallow',     1500, 1),
  ('Brownie',         2000, 2),
  ('Chocoramo',       2500, 3),
  ('Barquillo',       1500, 4),
  ('Chocolate extra', 2000, 5);

insert into public.product_toppings (product_id, topping_id)
select p.id, t.id from public.products p cross join public.toppings t;

-- Franjas de ejemplo: lunes a viernes. AJÚSTALAS a los descansos reales del colegio.
insert into public.time_slots (weekday, slot_time, max_orders)
select d, t::time, 8
from generate_series(1, 5) as d, unnest(array['10:00', '12:00', '12:30']) as t;

insert into public.prizes (name, emoji, kind, discount_percent, weight, stock, sort_order) values
  ('10% de descuento', '🎁', 'descuento_porcentaje', 10, 30, null, 1),
  ('Chocolate extra',  '🍫', 'chocolate_extra',      null, 20, null, 2),
  ('Topping gratis',   '🍓', 'topping_gratis',       null, 25, null, 3),
  ('Bowl gratis',      '🥣', 'bowl_gratis',          null,  5,    5, 4),
  ('Pincho gratis',    '🍡', 'pincho_gratis',        null, 10,   10, 5),
  ('Premio sorpresa',  '⭐', 'sorpresa',             null, 10, null, 6);

-- ---------------------------------------------------------------------
-- 9. CREAR AL ADMINISTRADOR (hacer DESPUÉS de ejecutar lo anterior)
-- 1) Supabase → Authentication → Users → Add user → Create new user
--    (correo + contraseña fuerte; marca "Auto Confirm User").
-- 2) Ejecuta esto cambiando el correo por el que acabas de crear:
--
-- insert into public.admins (id, email, full_name)
-- select id, email, 'Administrador' from auth.users
-- where email = 'CAMBIA-ESTE-CORREO@ejemplo.com';
-- ---------------------------------------------------------------------
