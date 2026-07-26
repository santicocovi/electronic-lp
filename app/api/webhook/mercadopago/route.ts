import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentById } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === "payment") {
      const paymentId = body.data?.id;
      if (!paymentId) return NextResponse.json({ ok: true });

      const mpPayment = await getPaymentById(String(paymentId));
      const orderId = mpPayment.external_reference;

      if (!orderId) return NextResponse.json({ ok: true });

      const statusMap: Record<string, string> = {
        approved: "APPROVED",
        rejected: "REJECTED",
        pending: "PENDING",
        in_process: "IN_PROCESS",
        refunded: "REFUNDED",
      };

      const paymentStatus = statusMap[mpPayment.status ?? ""] ?? "PENDING";
      const orderStatus =
        paymentStatus === "APPROVED" ? "PROCESSING"
        : paymentStatus === "REJECTED" ? "CANCELLED"
        : "PENDING";

      await db.order.update({
        where: { id: orderId },
        data: {
          paymentId: String(paymentId),
          paymentStatus: paymentStatus as never,
          status: orderStatus as never,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
