-- =====================================================================
-- Administradores de Fruti Delicias
-- 1) Supabase → Authentication → Users → Add user → Create new user
--    Crea UNA cuenta por persona (correo + contraseña propia) y marca "Auto Confirm User".
-- 2) Ejecuta este archivo. Se puede volver a ejecutar sin problema
--    (por ejemplo, si creas la segunda cuenta más tarde).
-- =====================================================================
insert into public.admins (id, email, full_name)
select id, email, split_part(email, '@', 1)
from auth.users
where lower(email) in ('alejandraxlaura2009@gmail.com', 'juanjose2708923munozmejia@gmail.com')
on conflict (id) do nothing;

-- Comprobación: debe mostrar los administradores creados.
select email, role, created_at from public.admins order by created_at;
