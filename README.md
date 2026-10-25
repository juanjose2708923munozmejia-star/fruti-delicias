# Fruti Delicias · Plataforma de pedidos (Fase 1)

Bowls y pinchos de fruta con chocolate · Institución Educativa Sagrada Familia, Caloto, Cauca.

## Qué incluye esta fase
- Página principal con la marca real (logo y fotos de Fruti Delicias).
- Menú leído desde la base de datos (Supabase) con personalización de toppings.
- Carrito con cantidades, toppings y totales en COP (se guarda en el dispositivo).
- Botón ACCEDER, login de administrador y panel protegido (middleware + verificación en servidor).
- Seguridad: claves solo en variables de entorno, reglas RLS en todas las tablas.

El envío del pedido (fecha, hora, confirmación), reseñas, ruleta, cupones, QR y estadísticas llegan en las siguientes fases.

## Puesta en marcha
1. `npm install`
2. Copia `.env.example` como `.env.local` y completa los valores de Supabase.
3. En Supabase → SQL Editor ejecuta, en este orden: `db/01_schema.sql` y luego `db/02_marca_fruti_delicias.sql`.
4. Crea al administrador (instrucciones al final de `01_schema.sql`).
5. `npm run dev` y abre http://localhost:3000

## Reemplazar imágenes
Las fotos están en `public/img/`. Para cambiar la foto de un producto, sube la nueva imagen allí y cambia su ruta (o desde el panel cuando esté la sección Productos).
