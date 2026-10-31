import { getCatalog } from "@/lib/catalog";
import { LegalShell } from "@/components/LegalShell";
import { LEGAL_DATE_TEXT } from "@/lib/legal";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Política de tratamiento de datos personales | Fruti Delicias" };

export default async function PrivacyPage() {
  const { settings } = await getCatalog();
  const email = settings.contact_email;
  const phone = settings.contact_whatsapp ? formatPhone(settings.contact_whatsapp) : null;

  return (
    <LegalShell name={settings.business_name} logoUrl={settings.logo_url} title="Política de tratamiento de datos personales" updated={LEGAL_DATE_TEXT}>
      <p>
        En {settings.business_name} cuidamos tus datos. Esta política explica qué información recogemos cuando haces un pedido, para qué la usamos y cómo
        puedes ejercer tus derechos, de acuerdo con la Ley 1581 de 2012 (protección de datos personales) y sus normas reglamentarias.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {settings.business_name}, emprendimiento escolar de la Institución Educativa Sagrada Familia, Caloto, Cauca, Colombia.
        {email && <> Correo: <a href={`mailto:${email}`}>{email}</a>.</>}
        {phone && <> WhatsApp: {phone}.</>}
      </p>

      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li><strong>Obligatorios para tu pedido:</strong> nombre, número de celular, productos elegidos, y día y hora de entrega.</li>
        <li><strong>Opcionales:</strong> correo electrónico, observaciones del pedido y, solo si pides domicilio, tu dirección, una referencia y la ubicación en Google Maps.</li>
        <li><strong>Si pagas por Nequi:</strong> la captura del comprobante de pago que subes.</li>
        <li><strong>Datos técnicos mínimos</strong> necesarios para que la página funcione (por ejemplo, tu pedido guardado en tu propio dispositivo).</li>
      </ul>
      <p>
        <strong>Datos sensibles.</strong> No te pedimos datos sensibles. Si decides escribir una alergia u otra condición de salud en las observaciones, es voluntario:
        solo la usamos para preparar tu pedido de forma segura y no estás obligado a darla.
      </p>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Registrar, preparar y entregar tu pedido (en el colegio o a domicilio).</li>
        <li>Contactarte por WhatsApp, llamada o correo sobre tu pedido: confirmarlo, ajustar la hora o avisarte que está listo.</li>
        <li>Verificar el pago, incluidos los comprobantes de Nequi, y prevenir fraudes.</li>
        <li>Enviarte tu recibo si diste un correo.</li>
        <li>Contar tus pedidos para ofrecerte descuentos o recompensas, y mejorar nuestro servicio.</li>
      </ul>

      <h2>4. Quién puede ver tus datos</h2>
      <p>
        Solo las personas autorizadas del equipo administrador. Para que la página funcione usamos proveedores tecnológicos que guardan o procesan información por
        nuestra cuenta: <strong>Supabase</strong> (base de datos, con servidores en Brasil), <strong>Vercel</strong> (alojamiento de la página, en Estados Unidos) y,
        cuando nos escribes o te escribimos, <strong>WhatsApp</strong>. Al aceptar esta política autorizas la transmisión y transferencia de tus datos a estos
        proveedores, que pueden estar fuera de Colombia. No vendemos tus datos.
      </p>

      <h2>5. Tus derechos</h2>
      <ul>
        <li>Conocer, actualizar y rectificar tus datos.</li>
        <li>Pedir prueba de la autorización que nos diste.</li>
        <li>Ser informado sobre el uso que le hemos dado a tus datos.</li>
        <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) si crees que se incumplió la ley.</li>
        <li>Revocar tu autorización y pedir que eliminemos tus datos, cuando la ley lo permita.</li>
        <li>Acceder de forma gratuita a tus datos.</li>
      </ul>

      <h2>6. Cómo ejercer tus derechos</h2>
      <p>
        Escríbenos{email && <> a <a href={`mailto:${email}`}>{email}</a></>}{phone && <> o por WhatsApp al {phone}</>}, indicando tu nombre, tu celular y lo que necesitas.
        Atendemos las <strong>consultas en máximo 10 días hábiles</strong> (prorrogables 5 días hábiles más) y los <strong>reclamos en máximo 15 días hábiles</strong> (prorrogables 8 días hábiles más),
        y te avisaremos el motivo de cualquier demora.
      </p>

      <h2>7. Seguridad y tiempo de conservación</h2>
      <p>
        Usamos conexión cifrada, acceso restringido con contraseña para el equipo y almacenamiento privado para los comprobantes de pago. Guardamos tus datos
        mientras sean necesarios para gestionar tus pedidos y cumplir obligaciones legales, o hasta que pidas su eliminación.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        Si tienes menos de 18 años, pide autorización a tu madre, padre o representante antes de hacer un pedido y de darnos tus datos.
      </p>

      <h2>9. Cambios a esta política</h2>
      <p>
        Si cambiamos esta política publicaremos la nueva versión en esta página con su fecha. Cuando haces un pedido guardamos la versión que aceptaste.
      </p>
    </LegalShell>
  );
}
