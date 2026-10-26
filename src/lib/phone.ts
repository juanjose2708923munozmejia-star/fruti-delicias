/** Devuelve el celular colombiano de 10 dígitos (empieza por 3) o null si no es válido. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? digits : null;
}

/** 3207186351 -> "320 718 6351" */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : digits;
}

/** Enlace de WhatsApp para un celular colombiano (agrega el 57 si falta). */
export function whatsappUrl(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
  return `https://wa.me/57${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
