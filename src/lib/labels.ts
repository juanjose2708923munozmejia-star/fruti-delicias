export const ORDER_STATUSES = ["nuevo", "confirmado", "en_preparacion", "listo", "entregado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const STATUS_LABELS: Record<OrderStatus, string> = {
  nuevo: "Nuevo",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUSES = ["pendiente", "comprobante_recibido", "verificado", "rechazado"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = "efectivo" | "nequi";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: "Efectivo al recoger",
  nequi: "Nequi",
};

export function paymentLabel(method: PaymentMethod, status: PaymentStatus, fulfillment: "recoger" | "domicilio" = "recoger"): string {
  if (method === "efectivo") return status === "verificado" ? "Pagado" : fulfillment === "domicilio" ? "Cobrar al entregar" : "Cobrar al recoger";
  if (status === "comprobante_recibido") return "Comprobante por revisar";
  if (status === "verificado") return "Pago verificado";
  if (status === "rechazado") return "Comprobante rechazado";
  return "Falta comprobante";
}
