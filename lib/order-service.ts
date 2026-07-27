import { db } from "@/lib/db";
import { sendOrderStatusUpdate } from "@/lib/mail";
import { formatMoney } from "@/lib/pricing";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_MESSAGES,
  buildTimeline,
  isOrderStatus,
  type OrderStatusKey,
} from "@/lib/order-status";

/**
 * Cambios de estado de pedidos.
 *
 * Es el único camino por el que un pedido cambia de estado, lo use el panel de
 * administración o el webhook de Mercado Pago. Centralizarlo garantiza que
 * siempre queden la bitácora y la notificación al cliente.
 */

export interface ChangeStatusOptions {
  orderId: string;
  status: OrderStatusKey;
  note?: string | null;
  /** Email del administrador; null/undefined si el cambio fue automático. */
  changedBy?: string | null;
  /** Permite guardar sin mandar email (ej: correcciones de carga). */
  notifyCustomer?: boolean;
  /** Devuelve el stock reservado. Se usa al cancelar. */
  restock?: boolean;
}

export interface ChangeStatusResult {
  changed: boolean;
  notified: boolean;
  message?: string;
}

export async function changeOrderStatus(
  options: ChangeStatusOptions
): Promise<ChangeStatusResult> {
  if (!isOrderStatus(options.status)) {
    return { changed: false, notified: false, message: "Estado inválido" };
  }

  const order = await db.order.findUnique({
    where: { id: options.orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      totalArs: true,
      currency: true,
      trackingNumber: true,
      trackingUrl: true,
      shippingCarrier: true,
      items: { select: { productId: true, variantId: true, quantity: true } },
      user: { select: { email: true } },
    },
  });

  if (!order) return { changed: false, notified: false, message: "Pedido no encontrado" };

  // Idempotente: repetir el mismo estado no reenvía el email ni duplica bitácora.
  if (order.status === options.status) {
    return { changed: false, notified: false, message: "El pedido ya está en ese estado" };
  }

  const shouldRestock =
    options.restock ??
    // Al cancelar o reembolsar se libera el stock, salvo que ya se hubiera liberado.
    (["CANCELLED", "REFUNDED"].includes(options.status) &&
      !["CANCELLED", "REFUNDED"].includes(order.status));

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: options.status,
        // Marca de tiempo del pago para los reportes del panel.
        ...(options.status === "APPROVED" ? { paidAt: new Date() } : {}),
      },
    });

    if (shouldRestock) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity }, salesCount: { decrement: item.quantity } },
          });
        }
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: options.status,
        note: options.note?.slice(0, 1000) || null,
        changedBy: options.changedBy ?? null,
        notified: false,
      },
    });
  });

  // El email va fuera de la transacción: un SMTP lento no debe mantener
  // abierta una transacción de base de datos.
  let notified = false;

  if (options.notifyCustomer !== false && order.user?.email) {
    notified = await sendOrderStatusUpdate({
      email: order.user.email,
      orderNumber: order.orderNumber,
      statusLabel: ORDER_STATUS_LABELS[options.status] ?? options.status,
      statusMessage: options.note?.trim() || ORDER_STATUS_MESSAGES[options.status] || "",
      timeline: buildTimeline(options.status),
      trackingNumber: order.trackingNumber,
      carrier: order.shippingCarrier,
      trackingUrl: order.trackingUrl,
    });

    if (notified) {
      // Se marca la última entrada de bitácora como notificada.
      const latest = await db.orderStatusHistory.findFirst({
        where: { orderId: order.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latest) {
        await db.orderStatusHistory
          .update({ where: { id: latest.id }, data: { notified: true } })
          .catch(() => {});
      }
    }
  }

  return { changed: true, notified };
}

/** Importe del pedido formateado para mostrar en el panel y en los emails. */
export function formatOrderTotal(order: {
  total: unknown;
  currency: string;
  totalArs?: unknown;
}): string {
  const currency = order.currency === "ARS" ? "ARS" : "USD";
  return formatMoney(Number(order.total), currency);
}
