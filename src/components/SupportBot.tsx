"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "bot" | "user"; text: string };
type Intent = { keys: string[]; answer: string };

/** Quita tildes y pasa a minúsculas para comparar palabras. */
function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const INTENTS: Intent[] = [
  {
    keys: ["pagar", "pago", "nequi", "efectivo", "plata", "transferencia", "comprobante", "captura"],
    answer:
      "Puedes pagar en efectivo cuando recojas (o recibas) tu pedido, o por Nequi: en la pantalla final te mostramos el número, haces el pago y subes la captura del comprobante. El equipo la revisa y confirma tu pago.",
  },
  {
    keys: ["domicilio", "llevan", "llevar", "casa", "envio", "enviar", "direccion de entrega", "maps"],
    answer:
      "Sí, puedes pedir domicilio a tu casa: al finalizar tu pedido eliges “Domicilio a mi casa”, escribes tu dirección y, si quieres, pegas el enlace de Google Maps o usas tu ubicación actual. Pagas en efectivo al recibir o por Nequi.",
  },
  {
    keys: ["recoger", "recojo", "recogida", "horario", "hora", "cuando", "donde", "dirección", "direccion", "ubicacion", "colegio"],
    answer:
      "Eliges el día y la hora de recogida al finalizar tu pedido (solo aparecen horarios disponibles). Recoges en la Institución Educativa Sagrada Familia, en Caloto, Cauca. El equipo puede ajustar la hora y la verás en el seguimiento.",
  },
  {
    keys: ["listo", "seguimiento", "estado", "avis", "notific", "demora", "tarda"],
    answer:
      "Al terminar tu pedido te damos un enlace de seguimiento. Ahí ves en qué paso va, y si dejas la página abierta puedes activar un aviso para cuando esté listo. El equipo también puede avisarte por WhatsApp.",
  },
  {
    keys: ["topping", "toppings", "recomienda", "recomendacion", "combinacion", "combinar", "sugerencia", "sabor", "que pido", "que me"],
    answer:
      "¡Mira estas ideas! 🍓 Fresa + banano con brownie y chocolate extra (el clásico). 🥭 Mango + piña con barquillo y marshmallow (fresco y crocante). 🍫 Si te encanta el chocolate: chocolate extra + chocoramo en trozos.",
  },
  {
    keys: ["precio", "cuesta", "vale", "valor", "cuanto", "barato"],
    answer: "Los precios aparecen en cada producto del menú y el de cada topping se muestra antes de agregarlo. El total final lo ves en tu pedido, con IVA 0 %.",
  },
  {
    keys: ["ingrediente", "fruta", "contiene", "alergia", "alergico", "gluten", "lactosa", "vegano"],
    answer:
      "Cada producto muestra sus ingredientes. Si tienes alergias o restricciones, escríbelo en las observaciones del pedido y consúltalo por WhatsApp antes de pagar: no puedo confirmar alérgenos por mi cuenta.",
  },
  {
    keys: ["descuento", "codigo", "cupon", "premio", "ruleta", "recompensa"],
    answer:
      "Estamos preparando descuentos y recompensas para clientes frecuentes. Cuando estén activos los verás en la página. Por ahora, tus pedidos entregados cuentan para futuras recompensas.",
  },
  {
    keys: ["cancelar", "cambiar", "modificar", "editar", "devolver", "reembolso"],
    answer: "Yo solo puedo responder preguntas y no puedo cambiar ni cancelar pedidos. Escríbele al equipo por WhatsApp con tu número de pedido y ellos te ayudan.",
  },
  {
    keys: ["whatsapp", "contacto", "contactar", "hablar", "telefono", "correo", "email"],
    answer: "Puedes escribirnos por WhatsApp o al correo que aparecen al final de la página. Ten a la mano tu número de pedido.",
  },
  {
    keys: ["hola", "buenas", "buenos", "hey", "saludos"],
    answer: "¡Hola! 🥭 ¿Quieres ayuda para elegir toppings, entender el pago o saber cuándo recoger tu pedido?",
  },
];

const FALLBACK =
  "Puedo ayudarte con toppings, precios, formas de pago, horarios de recogida y seguimiento. Para algo más específico, escríbele al equipo por WhatsApp. Recuerda que no puedo modificar pedidos ni pagos.";

function answerFor(text: string): string {
  const q = norm(text);
  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = intent.keys.reduce((n, k) => n + (q.includes(norm(k)) ? 1 : 0), 0);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best?.answer ?? FALLBACK;
}

const QUICK = ["¿Cómo pago?", "Recomiéndame toppings", "¿Cuándo recojo?", "¿Cómo sé si está listo?"];

function Robot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <line x1="32" y1="8" x2="32" y2="15" stroke="#2e0f08" strokeWidth="3" strokeLinecap="round" />
      <circle className="robot-bulb" cx="32" cy="6" r="4" fill="#f96f62" stroke="#2e0f08" strokeWidth="2" />
      <rect x="4" y="27" width="7" height="14" rx="3.5" fill="#f96f62" stroke="#2e0f08" strokeWidth="2.5" />
      <rect x="53" y="27" width="7" height="14" rx="3.5" fill="#f96f62" stroke="#2e0f08" strokeWidth="2.5" />
      <rect x="9" y="15" width="46" height="38" rx="13" fill="#fdd631" stroke="#2e0f08" strokeWidth="3" />
      <rect x="15" y="23" width="34" height="20" rx="10" fill="#2e0f08" />
      <ellipse className="robot-eye" cx="25" cy="32" rx="4" ry="5" fill="#fdd631" />
      <ellipse className="robot-eye" cx="39" cy="32" rx="4" ry="5" fill="#fdd631" />
      <path d="M27.5 38.5 Q32 42 36.5 38.5" fill="none" stroke="#f96f62" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function SupportBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "¡Hola! 🥭 Soy el asistente de Fruti Delicias. Te ayudo con toppings, pagos y recogida. No puedo modificar pedidos." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, typing, open]);

  function ask(text: string) {
    const q = text.trim().slice(0, 300);
    if (!q || typing) return;
    setMessages((m) => [...m, { from: "user", text: q }]);
    setInput("");
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { from: "bot", text: answerFor(q) }]);
      setTyping(false);
    }, 550);
  }

  return (
    <div className="support-widget">
      {open && (
        <section className="support-panel" aria-label="Asistente virtual">
          <header>
            <Robot className="robot-mini" />
            <div>
              <strong>Asistente Fruti</strong>
              <small>Solo responde preguntas</small>
            </div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar el asistente">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </header>
          <div className="support-messages" aria-live="polite">
            {messages.map((m, i) => (
              <p key={i} className={`chat-bubble ${m.from}`}>{m.text}</p>
            ))}
            {typing && <p className="chat-bubble bot typing" aria-label="Escribiendo"><span /><span /><span /></p>}
            <div ref={endRef} />
          </div>
          <div className="quick-replies">
            {QUICK.map((q) => (
              <button key={q} type="button" className="chip-btn chip-sm" onClick={() => ask(q)}>{q}</button>
            ))}
          </div>
          <form
            className="support-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Tu pregunta" maxLength={300} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={typing}>Enviar</button>
          </form>
        </section>
      )}
      <button className="support-launch" type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Cerrar el asistente virtual" : "Abrir el asistente virtual"}>
        <Robot className="robot-big" />
      </button>
    </div>
  );
}
