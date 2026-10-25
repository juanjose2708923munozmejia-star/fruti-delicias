-- =====================================================================
-- Fruti Delicias · Marca y fotos reales
-- Ejecutar DESPUÉS de 01_schema.sql (Supabase → SQL Editor → Run).
-- Es seguro ejecutarlo una vez. NO lo vuelvas a ejecutar después de
-- editar estos datos desde el panel, porque los sobrescribiría.
-- =====================================================================
update public.settings set
  business_name = 'Fruti Delicias',
  tagline       = 'El antojo que combina fruta, chocolate y felicidad.',
  description   = 'Fruta + chocolate = felicidad. Bowls y pinchos de fruta fresca con chocolate y toppings, preparados por estudiantes de la Institución Educativa Sagrada Familia.',
  logo_url      = '/img/logo.png'
where id = 1;

update public.products set image_url = '/img/bowl-tropical.jpg'     where slug = 'bowl-tropical';
update public.products set image_url = '/img/bowl-chocolatoso.jpg'  where slug = 'bowl-chocolatoso';
-- Los pinchos aún no tienen foto: la página muestra "Foto próximamente".
update public.products set image_url = null where slug in ('pincho-frutal', 'pincho-chocomix');
