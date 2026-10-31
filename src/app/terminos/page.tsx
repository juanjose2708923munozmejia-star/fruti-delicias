import { getCatalog } from "@/lib/catalog";
import { LegalShell } from "@/components/LegalShell";
import { LEGAL_DATE_TEXT } from "@/lib/legal";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata = { title: "Términos y condiciones | Fruti Delicias" };

export default async function TermsPage() {
  const { settings } = await getCatalog();
  const email = settings.contact_email;
  const phone = settings.contact_whatsapp ? formatPhone(settings.contact_whatsapp) : null;

  return (
    <LegalShell name={settings.business_name} logoUrl={settings.logo_url} title="Términos y condiciones" updated={LEGAL_DATE_TEXT}>
      <p>
        Al hacer un pedido en esta página aceptas estos términos. Están escritos en lenguaje sencillo y no limitan los derechos que te da el
        Estatuto del Consumidor (Ley 1480 de 2011).
      </p>

      <h2>1. Quiénes somos</h2>
      <p>
        {settings.business_name} es un emprendimiento escolar de la Institución Educativa Sagrada Familia, en Caloto, Cauca, que prepara y vende bowls y vasos de fruta con chocolate y toppings.
        {email && <> Contacto: <a href={`mailto:${email}`}>{email}</a></>}{phone && <> · WhatsApp {phone}</>}.
      </p>

      <h2>2. Cómo funciona un pedido</h2>
      <ul>
        <li>Eliges tu producto y tus toppings, y el día y la hora de recogida o entrega entre los horarios disponibles.</li>
        <li>Tu pedido queda registrado cuando ves la pantalla “¡Pedido recibido!”. Recibirás un número de pedido.</li>
        <li>Nuestro equipo puede escribirte para confirmar el pedido o ajustar la hora.</li>
        <li>Puedes recoger tu pedido en el colegio o pedir domicilio a tu casa, en las zonas y horarios que podamos atender.</li>
      </ul>

      <h2>3. Precios</h2>
      <p>
        Los precios están en pesos colombianos (COP) y son los que ves al hacer tu pedido. El total se calcula de nuevo en nuestro servidor al confirmar.
        Por ahora el domicilio no tiene costo adicional; si cambia, te lo informaremos antes de que confirmes.
      </p>

      <h2>4. Formas de pago</h2>
      <ul>
        <li><strong>Efectivo</strong> al recoger o al recibir tu pedido.</li>
        <li><strong>Nequi:</strong> pagas el valor exacto al número que aparece en la página y subes la captura del comprobante. Nuestro equipo la revisa y confirma el pago.</li>
      </ul>
      <p>
        Podemos rechazar un comprobante si no se ve claro, si el valor no coincide, si no encontramos el pago o si parece alterado. Si esto pasa, te escribiremos para que lo corrijas o pagues en efectivo.
        Si pagaste a otro número distinto del que aparece en la página, no podemos responder por ese pago.
      </p>

      <h2>5. Recogida y entrega</h2>
      <p>
        Por ser alimentos frescos, te pedimos llegar en el horario acordado. Si pasa mucho tiempo, no podemos garantizar la calidad del producto. En domicilio, revisa que tu dirección sea correcta y contesta
        nuestros mensajes; si nadie recibe el pedido, te contactaremos para coordinarlo.
      </p>

      <h2>6. Cancelaciones y cambios</h2>
      <p>
        Si necesitas cambiar o cancelar, escríbenos lo antes posible por WhatsApp con tu número de pedido. Como preparamos los alimentos al momento y se deterioran con rapidez, no es posible devolverlos una vez preparados.
        Si hay un error en tu pedido o llega en mal estado, avísanos y lo resolvemos. También podemos cancelar un pedido por falta de ingredientes o por causas fuera de nuestro control; en ese caso te devolvemos lo que hayas pagado por Nequi.
      </p>

      <h2>7. Alimentos y alergias</h2>
      <p>
        Nuestros productos llevan fruta, chocolate, galletas y otros ingredientes que pueden causar alergias, y se preparan en un lugar donde se manipulan varios ingredientes. Si tienes alguna alergia o restricción, escríbela en las observaciones y consúltanos por WhatsApp antes de pagar.
      </p>

      <h2>8. Uso correcto de la página</h2>
      <p>
        No está permitido hacer pedidos falsos, subir comprobantes alterados ni intentar dañar o saturar la página. Podemos cancelar esos pedidos y bloquear su uso.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        El nombre, el logo, los textos y las fotos de {settings.business_name} pertenecen al emprendimiento. No los copies ni los uses sin permiso.
      </p>

      <h2>10. Tus datos</h2>
      <p>
        Tratamos tus datos según nuestra <a href="/privacidad">Política de tratamiento de datos personales</a>.
      </p>

      <h2>11. Cierre o pausa del servicio</h2>
      <p>
        El emprendimiento puede pausar o cerrar temporal o definitivamente los pedidos. Si esto afecta un pedido ya pagado, te devolveremos tu dinero.
      </p>

      <h2>12. Ley aplicable y reclamos</h2>
      <p>
        Estos términos se rigen por las leyes de Colombia. Para peticiones, quejas o reclamos escríbenos a los canales de contacto de arriba. Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio.
      </p>
    </LegalShell>
  );
}
