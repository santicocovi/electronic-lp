"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, toActionError } from "@/lib/auth-guard";
import { changeOrderStatus } from "@/lib/order-service";
import { sendOrderStatusUpdate } from "@/lib/mail";
import {
  isOrderStatus,
  ORDER_STATUS_LABELS,
  buildTimeline,
  SHIPPING_CARRIERS,
} from "@/lib/order-status";
import type { ActionResult } from "@/types";

/** Administración de pedidos: estados, seguimiento y notificaciones. */

function revalidateOrder(id: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/profile/orders");
  revalidatePath(`/profile/orders/${id}`);
}

/**
 * Cambia el estado de un pedido y notifica al cliente por email.
 * La bitácora y el email los maneja `changeOrderStatus`.
 */
export async function updateOrderStatus(
  id: string,
  status: string,
  options?: { note?: string; notify?: boolean }
): Promise<ActionResult<{ notified: boolean }>> {
  try {
    const admin = await requireAdmin();

    if (!isOrderStatus(status)) {
      return { success: false, error: "Estado inválido" };
    }

    const result = await changeOrderStatus({
      orderId: id,
      status,
      note: options?.note,
      changedBy: admin.email,
      notifyCustomer: options?.notify !== false,
    });

    if (!result.changed) {
      return { success: false, error: result.message ?? "No se pudo actualizar el pedido" };
    }

    revalidateOrder(id);

    return {
      success: true,
      data: { notified: result.notified },
      message: result.notified
        ? `Estado actualizado a "${ORDER_STATUS_LABELS[status]}" y notificado al cliente.`
        : `Estado actualizado a "${ORDER_STATUS_LABELS[status]}". No se envió el email (revisá la configuración de SMTP).`,
    };
  } catch (error) {
    return toActionError(error, "Error al actualizar el pedido");
  }
}

/**
 * Guarda el número de seguimiento y la empresa de envío.
 * Si se pide notificar, se le manda el email al cliente con los datos nuevos.
 */
export async function updateOrderTracking(
  id: string,
  input: {
    trackingNumber?: string;
    carrier?: string;
    trackingUrl?: string;
    notify?: boolean;
  } | string
): Promise<ActionResult<{ notified: boolean }>> {
  try {
    const admin = await requireAdmin();

    // Compatibilidad: la firma anterior recibía solo el número como string.
    const data = typeof input === "string" ? { trackingNumber: input } : input;

    const trackingNumber = data.trackingNumber?.trim() || null;
    const carrier = data.carrier?.trim() || null;

    // Si el transportista es uno de los conocidos y no se pasó URL, se usa la suya.
    let trackingUrl = data.trackingUrl?.trim() || null;
    if (!trackingUrl && carrier) {
      trackingUrl = SHIPPING_CARRIERS.find((c) => c.name === carrier)?.trackingUrl ?? null;
    }

    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      return { success: false, error: "El link de seguimiento debe empezar con http:// o https://" };
    }

    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        trackingNumber: true,
        shippingCarrier: true,
        user: { select: { email: true } },
      },
    });

    if (!order) return { success: false, error: "Pedido no encontrado" };

    const changed =
      order.trackingNumber !== trackingNumber || order.shippingCarrier !== carrier;

    await db.order.update({
      where: { id },
      data: { trackingNumber, shippingCarrier: carrier, trackingUrl },
    });

    let notified = false;

    // Solo se notifica si efectivamente cambió algo relevante.
    if (data.notify && changed && order.user?.email && trackingNumber) {
      notified = await sendOrderStatusUpdate({
        email: order.user.email,
        orderNumber: order.orderNumber,
        statusLabel: "Datos de seguimiento",
        statusMessage:
          "Cargamos los datos de seguimiento de tu envío. Ya podés rastrearlo con el número que figura abajo.",
        timeline: buildTimeline(order.status),
        trackingNumber,
        carrier,
        trackingUrl,
      });
    }

    if (changed) {
      await db.orderStatusHistory.create({
        data: {
          orderId: id,
          status: order.status as never,
          note: `Seguimiento actualizado${carrier ? ` · ${carrier}` : ""}${trackingNumber ? ` · ${trackingNumber}` : ""}`,
          changedBy: admin.email,
          notified,
        },
      }).catch(() => {});
    }

    revalidateOrder(id);

    return {
      success: true,
      data: { notified },
      message: notified ? "Seguimiento guardado y notificado al cliente." : "Seguimiento guardado.",
    };
  } catch (error) {
    return toActionError(error, "Error al guardar el seguimiento");
  }
}

/** Notas internas del pedido, visibles solo en el panel. */
export async function updateOrderNotes(id: string, notes: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    await db.order.update({
      where: { id },
      data: { notes: notes.trim().slice(0, 2000) || null },
    });

    revalidateOrder(id);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Error al guardar las notas");
  }
}

/** Reenvía manualmente el email del estado actual (si el primero no llegó). */
export async function resendOrderStatusEmail(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const order = await db.order.findUnique({
      where: { id },
      select: {
        orderNumber: true,
        status: true,
        trackingNumber: true,
        trackingUrl: true,
        shippingCarrier: true,
        user: { select: { email: true } },
      },
    });

    if (!order?.user?.email) return { success: false, error: "El pedido no tiene email asociado" };

    const sent = await sendOrderStatusUpdate({
      email: order.user.email,
      orderNumber: order.orderNumber,
      statusLabel: ORDER_STATUS_LABELS[order.status] ?? order.status,
      statusMessage: "",
      timeline: buildTimeline(order.status),
      trackingNumber: order.trackingNumber,
      carrier: order.shippingCarrier,
      trackingUrl: order.trackingUrl,
    });

    if (!sent) {
      return {
        success: false,
        error: "No se pudo enviar el email. Revisá la configuración de SMTP.",
      };
    }

    await db.orderStatusHistory.create({
      data: {
        orderId: id,
        status: order.status as never,
        note: "Reenvío manual de la notificación.",
        changedBy: admin.email,
        notified: true,
      },
    }).catch(() => {});

    revalidateOrder(id);
    return { success: true, message: "Email reenviado al cliente." };
  } catch (error) {
    return toActionError(error, "Error al reenviar el email");
  }
}
