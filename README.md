# Fruti Delicias · Plataforma de pedidos

Bowls y pinchos de fruta con chocolate · Institución Educativa Sagrada Familia, Caloto, Cauca.

## Qué incluye esta versión
- Página con la marca real, menú, toppings y carrito en COP.
- **Pedido completo**: datos del cliente, día y hora de recogida (solo horarios disponibles y con cupo), pago en **efectivo al recoger** o **Nequi** con captura del comprobante.
- El servidor recalcula precios y valida todo; protege contra pedidos duplicados y robots.
- **Recibo virtual** (logo, pedido, total, IVA 0 %, detalle, forma de pago, hora del pedido y hora de pago), imprimible.
- **Seguimiento** del pedido para el cliente, con aviso cuando esté listo (con la página abierta).
- **Panel de administrador** (solo cuentas autorizadas): ver pedidos, abrir comprobantes, verificar o rechazar pagos, asignar hora de recogida, cambiar estado, avisar por WhatsApp.
- Asistente virtual (solo responde preguntas; no puede cambiar nada).
- Contacto de WhatsApp y correo en el pie de página.

## Pendiente para la siguiente etapa
Reseñas reales con estrellas, envío del recibo por correo, códigos de descuento de un solo uso, ruleta de premios, perfil del administrador (foto, contraseña, teléfono) y asistente con IA.

## Puesta en marcha
1. En Supabase → SQL Editor ejecuta, en este orden: `db/01_schema.sql`, `db/02_marca_fruti_delicias.sql`, `db/03_pedidos_y_pagos.sql`.
2. Crea las cuentas de administrador en Authentication → Users y ejecuta `db/04_administradores.sql`.
3. En Vercel, Settings → Environment Variables, agrega las variables de `.env.example`.
4. Publica y prueba un pedido en efectivo y otro por Nequi.

No guardes contraseñas en el código ni las compartas por chat.
