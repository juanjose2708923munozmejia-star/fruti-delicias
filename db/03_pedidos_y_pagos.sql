-- =====================================================================
-- Fruti Delicias · Pedidos, pagos (efectivo y Nequi), comprobantes y avisos
-- Ejecutar DESPUÉS de 01_schema.sql y 02_marca_fruti_delicias.sql.
-- Supabase → SQL Editor → New query → pegar TODO → Run. Una sola vez.
-- =====================================================================

create type payment_method as enum ('efectivo', 'nequi');
create type payment_status as enum ('pendiente', 'comprobante_recibido', 'verificado', 'rechazado');

alter table public.orders
  add column customer_email        text check (char_length(customer_email) <= 254),
  add column payment_method        payment_method not null default 'efectivo',
  add column payment_status        payment_status not null default 'pendiente',
  add column payment_receipt_path  text,
  add column paid_at               timestamptz,   -- hora de pago (la fija el administrador al verificar)
  add column payment_verified_by   uuid,
  add column assigned_pickup_time  time,          -- hora de recogida que asigna el administrador
  add column ready_at              timestamptz;   -- cuándo se marcó "listo"

create index idx_orders_payment_status on public.orders (payment_status);

-- Al pasar a "listo" se guarda la hora automáticamente.
create or replace function public.set_ready_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'listo' and old.status is distinct from 'listo' then
    new.ready_at = now();
  end if;
  return new;
end $$;

create trigger trg_orders_ready_at
  before update of status on public.orders
  for each row execute function public.set_ready_at();

-- Configuración de pagos y contacto (editable luego desde el panel)
alter table public.settings
  add column nequi_number  text default '3207186351',
  add column nequi_holder  text,
  add column cash_enabled  boolean not null default true,
  add column nequi_enabled boolean not null default true;

update public.settings set
  nequi_number     = '3207186351',
  contact_phone    = '3207186351',
  contact_whatsapp = '3207186351',
  contact_email    = 'juanjose2708923munozmejia@gmail.com'
where id = 1;

-- Perfil de administrador
alter table public.admins
  add column role   text not null default 'admin' check (role in ('admin')),
  add column phone  text,
  add column avatar_url text;

-- Bucket PRIVADO para las capturas de comprobante (nadie las ve sin permiso).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Solo los administradores pueden ver los comprobantes (el servidor los sube con su clave secreta).
create policy "receipts_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_admin());
