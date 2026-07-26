import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { code, orderTotal } = await req.json();

    const coupon = await db.coupon.findUnique({
      where: { code: String(code).toUpperCase(), isActive: true },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Cupón no encontrado" });
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      return NextResponse.json({ valid: false, message: "El cupón no está activo aún" });
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      return NextResponse.json({ valid: false, message: "El cupón ha expirado" });
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, message: "El cupón ha alcanzado su límite de usos" });
    }
    if (coupon.minOrderAmount && orderTotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json({
        valid: false,
        message: `El pedido mínimo para este cupón es $${Number(coupon.minOrderAmount).toLocaleString("es-AR")}`,
      });
    }

    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = (orderTotal * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else {
      discount = Number(coupon.value);
    }

    return NextResponse.json({ valid: true, discount: Math.round(discount), couponId: coupon.id });
  } catch {
    return NextResponse.json({ valid: false, message: "Error al validar el cupón" }, { status: 500 });
  }
}
