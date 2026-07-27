/** Etiquetas, colores y máquina de estados de los pedidos. */

export const ORDER_STATUSES = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatusKey = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: unknown): value is OrderStatusKey {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * Recorrido normal de un pedido, en orden. Los estados terminales negativos
 * (CANCELLED, REFUNDED) quedan fuera porque no forman parte de la línea de
 * tiempo que ve el cliente.
 */
export const ORDER_FLOW: OrderStatusKey[] = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pedido recibido",
  APPROVED: "Pago confirmado",
  PROCESSING: "Preparando pedido",
  SHIPPED: "Enviado",
  OUT_FOR_DELIVERY: "En reparto",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

/** Texto que recibe el cliente por email en cada cambio de estado. */
export const ORDER_STATUS_MESSAGES: Record<string, string> = {
  PENDING: "Recibimos tu pedido y lo estamos revisando. Te avisamos apenas se confirme el pago.",
  APPROVED: "¡Confirmamos tu pago! Ya estamos organizando la preparación de tu pedido.",
  PROCESSING: "Estamos preparando tu pedido para despacharlo. Te avisamos cuando salga.",
  SHIPPED: "Tu pedido ya fue despachado y está en camino.",
  OUT_FOR_DELIVERY: "Tu pedido está en reparto y llega hoy. Procurá que haya alguien para recibirlo.",
  DELIVERED: "Tu pedido fue entregado. ¡Gracias por comprar en Electronic LP!",
  CANCELLED: "Tu pedido fue cancelado. Si creés que se trata de un error, respondé este email.",
  REFUNDED: "Procesamos el reembolso de tu pedido. Puede demorar unos días hábiles en impactar.",
};

/**
 * Construye la línea de tiempo para el email y la vista del cliente,
 * marcando cada paso como completado, actual o pendiente.
 */
export function buildTimeline(
  current: string
): { label: string; state: "done" | "current" | "pending" }[] {
  // Un pedido cancelado o reembolsado no tiene línea de tiempo de entrega.
  if (current === "CANCELLED" || current === "REFUNDED") {
    return [{ label: ORDER_STATUS_LABELS[current], state: "current" }];
  }

  const currentIndex = ORDER_FLOW.indexOf(current as OrderStatusKey);

  return ORDER_FLOW.map((status, index) => ({
    label: ORDER_STATUS_LABELS[status],
    state:
      currentIndex === -1
        ? "pending"
        : index < currentIndex
          ? "done"
          : index === currentIndex
            ? "current"
            : "pending",
  }));
}

/** Estados a los que se puede pasar desde `current`. Evita saltos incoherentes. */
export function allowedTransitions(current: string): OrderStatusKey[] {
  if (current === "DELIVERED") return ["REFUNDED"];
  if (current === "REFUNDED") return [];
  if (current === "CANCELLED") return ["PENDING"];

  const index = ORDER_FLOW.indexOf(current as OrderStatusKey);
  if (index === -1) return [...ORDER_FLOW, "CANCELLED"];

  // Se permite avanzar o retroceder en el flujo (para corregir errores de carga)
  // y cancelar en cualquier punto previo a la entrega.
  return [...ORDER_FLOW.filter((_, i) => i !== index), "CANCELLED", "REFUNDED"];
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  IN_PROCESS: "En proceso",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROCESS: "bg-blue-100 text-blue-700",
  REFUNDED: "bg-gray-100 text-gray-600",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  MERCADOPAGO: "Mercado Pago",
  TRANSFER: "Transferencia bancaria",
  CASH: "Efectivo",
  USDT: "USDT",
};

/** Empresas de envío sugeridas en el panel, con su URL de seguimiento. */
export const SHIPPING_CARRIERS: { name: string; trackingUrl?: string }[] = [
  { name: "Andreani", trackingUrl: "https://www.andreani.com/#!/informacionEnvio/" },
  { name: "OCA", trackingUrl: "https://www.oca.com.ar/Tracking/Track/" },
  { name: "Correo Argentino", trackingUrl: "https://www.correoargentino.com.ar/formularios/e-commerce" },
  { name: "Vía Cargo", trackingUrl: "https://www.viacargo.com.ar/seguimiento" },
  { name: "Envío propio (La Plata)" },
  { name: "Retiro en persona" },
];
