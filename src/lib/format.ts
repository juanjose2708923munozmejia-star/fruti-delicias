/** Formatea pesos colombianos: 8000 -> "$8.000" (sin depender del soporte de agrupación del navegador). */
export function formatCOP(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
