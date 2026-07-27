import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCoupon } from "@/lib/coupons";
import { getCurrentUser } from "@/lib/auth-guard";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { round2 } from "@/lib/pricing";

/**
 * Validación de cupones para la UI.
 *
 * El descuento que devuelve es informativo: el importe que realmente se aplica
 * lo recalcula `createOrder` al cerrar el pedido. Aun así el endpoint:
 *   · exige sesión, para que no se puedan enumerar códigos de forma anónima;
 *   · limita la cantidad de intentos, para frenar la fuerza bruta;
 *   · calcula el subtotal leyendo los precios de la base, nunca del cliente.
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { valid: false, message: "Iniciá sesión para usar cupones" },
      { status: 401 }
    );
  }

  // 20 intentos cada 10 minutos: suficiente para tipeos, insuficiente para
  // recorrer un diccionario de códigos.
  const limit = rateLimit(`coupon:${user.id}:${getClientIp(req.headers)}`, 20, 10 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { valid: false, message: "Demasiados intentos. Esperá unos minutos." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: { code?: unknown; items?: unknown; orderTotal?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false, message: "Solicitud inválida" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ valid: false, message: "Ingresá un código" }, { status: 400 });
  }

  // El subtotal se reconstruye con los precios reales de los productos.
  let subtotal = 0;

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const parsedItems = rawItems
    .map((i) => ({
      productId: String((i as { productId?: unknown })?.productId ?? ""),
      variantId: (i as { variantId?: unknown })?.variantId
        ? String((i as { variantId: unknown }).variantId)
        : null,
      quantity: Number((i as { quantity?: unknown })?.quantity),
    }))
    .filter((i) => i.productId && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 50);

  if (parsedItems.length > 0) {
    const products = await db.product.findMany({
      where: { id: { in: parsedItems.map((i) => i.productId) }, isActive: true },
      select: {
        id: true,
        price: true,
        variants: { select: { id: true, price: true, isActive: true } },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    for (const item of parsedItems) {
      const product = byId.get(item.productId);
      if (!product) continue;

      let unitPrice = Number(product.price);
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId && v.isActive);
        if (!variant) continue;
        if (variant.price !== null) unitPrice = Number(variant.price);
      }

      subtotal += unitPrice * item.quantity;
    }

    subtotal = round2(subtotal);
  }

  if (subtotal <= 0) {
    return NextResponse.json(
      { valid: false, message: "No pudimos calcular el total de tu carrito" },
      { status: 400 }
    );
  }

  const result = await validateCoupon({ code, subtotal, userId: user.id });

  if (!result.valid) {
    return NextResponse.json({ valid: false, message: result.message });
  }

  return NextResponse.json({
    valid: true,
    discount: result.discount,
    code: result.code,
    couponId: result.couponId,
  });
}
