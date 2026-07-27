/** Shared labels/colors for order and payment statuses across the admin. */

export const ORDER_STATUSES = [
  "PENDING", "APPROVED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  IN_PROCESS: "En proceso",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROCESS: "bg-blue-100 text-blue-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  MERCADOPAGO: "Mercado Pago",
  TRANSFER: "Transferencia",
  CASH: "Efectivo",
};
