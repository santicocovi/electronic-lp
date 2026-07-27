import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentById, verifyWebhookSignature, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { changeOrderStatus } from "@/lib/order-service";

/**
 * Webhook de notificaciones de Mercado Pago.
 *
 * Seguridad:
 *  · Se valida la firma HMAC `x-signature` antes de tocar la base de datos.
 *  · El estado se lee consultando la API de MP con el id del pago, no del body:
 *    el cuerpo de la petición no es una fuente confiable.
 *  · Es idempotente: MP reintenta la misma notificación varias veces.
 *
 * Siempre responde 200 salvo error real de servidor. Un 4xx hace que MP
 * reintente indefinidamente una notificación que nunca va a poder procesar.
 */

// El webhook nunca debe servirse desde caché.
export const dynamic = "force-dynamic";

/** Mapea el estado del pago de MP al enum PaymentStatus. */
const PAYMENT_STATUS_MAP: Record<string, "APPROVED" | "REJECTED" | "PENDING" | "IN_PROCESS" | "REFUNDED"> = {
  approved: "APPROVED",
  authorized: "APPROVED",
  rejected: "REJECTED",
  cancelled: "REJECTED",
  pending: "PENDING",
  in_process: "IN_PROCESS",
  in_mediation: "IN_PROCESS",
  refunded: "REFUNDED",
  charged_back: "REFUNDED",
};

export async function POST(req: NextRequest) {
  try {
    if (!isMercadoPagoConfigured()) {
      console.error("[webhook-mp] Mercado Pago no está configurado.");
      return NextResponse.json({ ok: true });
    }

    const rawBody = await req.text();
    let body: { type?: string; action?: string; data?: { id?: string | number } };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: true });
    }

    // MP manda distintos tipos de notificación; solo interesan las de pago.
    const isPaymentNotification =
      body.type === "payment" || body.action?.startsWith("payment.");
    if (!isPaymentNotification) return NextResponse.json({ ok: true });

    const dataId = body.data?.id ? String(body.data.id) : null;
    if (!dataId) return NextResponse.json({ ok: true });

    // ── Validación de firma ──────────────────────────────────
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (secret) {
      const verification = verifyWebhookSignature({
        signatureHeader: req.headers.get("x-signature"),
        requestId: req.headers.get("x-request-id"),
        dataId,
        secret,
      });

      if (!verification.valid) {
        console.warn(`[webhook-mp] Firma rechazada: ${verification.reason}`);
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    } else {
      // Sin secreto configurado no se puede verificar el origen. Se procesa
      // igual para no romper la operación, pero queda registrado como riesgo.
      console.warn(
        "[webhook-mp] MERCADOPAGO_WEBHOOK_SECRET no está configurado: " +
          "el webhook se está procesando SIN validar la firma."
      );
    }

    // ── Estado real, consultado a la API de MP ───────────────
    const mpPayment = await getPaymentById(dataId);
    const orderId = mpPayment.external_reference;

    if (!orderId) {
      console.warn(`[webhook-mp] El pago ${dataId} no tiene external_reference.`);
      return NextResponse.json({ ok: true });
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true, paymentId: true },
    });

    if (!order) {
      console.warn(`[webhook-mp] Pedido ${orderId} inexistente.`);
      return NextResponse.json({ ok: true });
    }

    const paymentStatus = PAYMENT_STATUS_MAP[mpPayment.status ?? ""] ?? "PENDING";

    // Idempotencia: si ya se procesó este mismo pago con este mismo estado,
    // no se repite el trabajo ni se reenvía el email al cliente.
    if (order.paymentId === dataId && order.paymentStatus === paymentStatus) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    await db.order.update({
      where: { id: orderId },
      data: { paymentId: dataId, paymentStatus },
    });

    // El estado del pedido acompaña al del pago. PENDING e IN_PROCESS no
    // cambian el estado del pedido: sigue esperando confirmación.
    const nextOrderStatus =
      paymentStatus === "APPROVED"
        ? "APPROVED"
        : paymentStatus === "REJECTED"
          ? "CANCELLED"
          : paymentStatus === "REFUNDED"
            ? "REFUNDED"
            : null;

    if (nextOrderStatus && order.status !== nextOrderStatus) {
      await changeOrderStatus({
        orderId,
        status: nextOrderStatus,
        note:
          nextOrderStatus === "CANCELLED"
            ? "El pago fue rechazado por Mercado Pago."
            : null,
        changedBy: null, // automático
        // Al rechazarse o reembolsarse se devuelve el stock reservado.
        restock: nextOrderStatus !== "APPROVED",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhook-mp] Error procesando la notificación:", error);
    // 500 para que Mercado Pago reintente.
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** MP hace un GET de verificación al configurar la URL en el panel. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
