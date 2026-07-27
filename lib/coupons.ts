import { db } from "@/lib/db";
import { round2 } from "@/lib/pricing";

/**
 * Validación de cupones. Es la única fuente de verdad: la usan tanto el
 * endpoint que consulta el checkout como `createOrder` al cerrar el pedido.
 * El descuento se recalcula siempre acá, nunca se acepta el que manda el
 * navegador.
 */

export type CouponValidation =
  | { valid: true; couponId: string; code: string; discount: number }
  | { valid: false; message: string };

export interface ValidateCouponInput {
  code: string;
  /** Subtotal de productos en moneda base, calculado en el servidor. */
  subtotal: number;
  /** Se usa para aplicar el límite por usuario. */
  userId?: string;
}

export async function validateCoupon(input: ValidateCouponInput): Promise<CouponValidation> {
  const code = String(input.code ?? "").trim().toUpperCase();
  if (!code) return { valid: false, message: "Ingresá un código" };

  const coupon = await db.coupon.findUnique({ where: { code } });

  // Un cupón inactivo se reporta como inexistente para no filtrar su existencia.
  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "Cupón no encontrado" };
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    return { valid: false, message: "El cupón no está activo aún" };
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    return { valid: false, message: "El cupón ha expirado" };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: "El cupón alcanzó su límite de usos" };
  }

  const minOrder = coupon.minOrderAmount === null ? null : Number(coupon.minOrderAmount);
  if (minOrder !== null && input.subtotal < minOrder) {
    return {
      valid: false,
      message: `El pedido mínimo para este cupón es ${minOrder.toLocaleString("es-AR")}`,
    };
  }

  // Límite por usuario: hasta ahora estaba en el esquema pero no se aplicaba.
  if (coupon.perUserLimit !== null && input.userId) {
    const usedByUser = await db.order.count({
      where: {
        userId: input.userId,
        couponId: coupon.id,
        // Los pedidos cancelados no consumen el cupón.
        status: { notIn: ["CANCELLED", "REFUNDED"] },
      },
    });

    if (usedByUser >= coupon.perUserLimit) {
      return { valid: false, message: "Ya usaste este cupón la cantidad máxima de veces" };
    }
  }

  let discount: number;
  if (coupon.type === "PERCENTAGE") {
    discount = (input.subtotal * Number(coupon.value)) / 100;
    if (coupon.maxDiscount !== null) {
      discount = Math.min(discount, Number(coupon.maxDiscount));
    }
  } else {
    discount = Number(coupon.value);
  }

  // El descuento nunca puede superar el subtotal.
  discount = round2(Math.min(Math.max(0, discount), input.subtotal));

  if (discount <= 0) {
    return { valid: false, message: "El cupón no aplica a este pedido" };
  }

  return { valid: true, couponId: coupon.id, code: coupon.code, discount };
}
