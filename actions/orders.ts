"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createCheckoutPreference } from "@/lib/mercadopago";
import {
  sendOrderConfirmation,
  sendPaymentInstructions,
} from "@/lib/mail";
import { requireVerifiedUser, toActionError, AuthError } from "@/lib/auth-guard";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateCoupon } from "@/lib/coupons";
import { quoteShipping } from "@/lib/shipping";
import {
  computeTotals,
  getPricingConfig,
  isPaymentOptionKey,
  PAYMENT_OPTIONS,
  formatMoney,
  round2,
  type PaymentOptionKey,
  type PricedLine,
} from "@/lib/pricing";
import { getExchangeRate } from "@/lib/currency";
import { checkoutSchema } from "@/validations";
import type { ActionResult } from "@/types";

/**
 * Creación de pedidos.
 *
 * Todo lo que define plata se resuelve en el servidor:
 *   · el usuario sale de la sesión, no del formulario;
 *   · los precios se releen de la base por id de producto/variante;
 *   · el costo de envío sale del método de envío guardado;
 *   · el descuento se recalcula validando el cupón;
 *   · el recargo lo determina el medio de pago elegido.
 *
 * Del cliente solo se aceptan: qué productos, cuántas unidades, a dónde se
 * envía y con qué medio de pago se abona.
 */

/** Límite defensivo por línea: evita pedidos absurdos y overflow de enteros. */
const MAX_QUANTITY_PER_LINE = 50;
const MAX_LINES_PER_ORDER = 50;

interface OrderLineInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

interface CreateOrderInput {
  items: OrderLineInput[];
  shipping: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    number: string;
    apartment?: string;
    city: string;
    province: string;
    postalCode: string;
  };
  /**
   * Id de la opción de envío cotizada (ej: "andreani:domicilio", "local:pickup").
   * Se revalida en el servidor: nunca se confía en el precio del navegador.
   */
  shippingOptionId: string;
  paymentOption: PaymentOptionKey;
  couponCode?: string;
  notes?: string;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  /** Presente solo con Mercado Pago: URL del checkout a la que hay que ir. */
  redirectUrl?: string;
  /** true en los medios coordinados (efectivo, transferencia, USDT). */
  requiresManualPayment: boolean;
}

/** Error de negocio con mensaje apto para mostrarle al cliente. */
class CheckoutError extends Error {}

/** Genera un número de pedido legible: ELP-AAMMDD-XXXX. */
function buildOrderNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `ELP-${yy}${mm}${dd}-${suffix}`;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<CreateOrderResult>> {
  try {
    // ── 1. Identidad y permisos ──────────────────────────────
    // El userId sale de la sesión: antes venía en el payload y permitía crear
    // pedidos a nombre de cualquier otro usuario.
    const user = await requireVerifiedUser();

    const ip = getClientIp(await headers());
    const limit = rateLimit(`checkout:${user.id}:${ip}`, 10, 10 * 60 * 1000);
    if (!limit.success) {
      return { success: false, error: "Demasiados intentos de compra seguidos. Esperá unos minutos." };
    }

    // ── 2. Validación de la entrada ──────────────────────────
    const shippingParsed = checkoutSchema
      .omit({ couponCode: true, notes: true, shippingMethodId: true })
      .safeParse(input.shipping);

    if (!shippingParsed.success) {
      return {
        success: false,
        error: shippingParsed.error.issues[0]?.message ?? "Datos de envío inválidos",
      };
    }

    if (!isPaymentOptionKey(input.paymentOption)) {
      return { success: false, error: "Medio de pago inválido" };
    }
    const paymentOption = PAYMENT_OPTIONS[input.paymentOption];

    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { success: false, error: "El carrito está vacío" };
    }
    if (input.items.length > MAX_LINES_PER_ORDER) {
      return { success: false, error: "El pedido tiene demasiados productos distintos" };
    }

    // Se consolidan líneas repetidas y se validan las cantidades.
    const normalized = new Map<string, OrderLineInput>();
    for (const raw of input.items) {
      const productId = String(raw?.productId ?? "");
      const variantId = raw?.variantId ? String(raw.variantId) : null;
      const quantity = Number(raw?.quantity);

      if (!productId) return { success: false, error: "Producto inválido en el carrito" };
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
        return { success: false, error: "Cantidad inválida en el carrito" };
      }

      const key = `${productId}::${variantId ?? ""}`;
      const existing = normalized.get(key);
      const total = (existing?.quantity ?? 0) + quantity;

      if (total > MAX_QUANTITY_PER_LINE) {
        return { success: false, error: `No se pueden comprar más de ${MAX_QUANTITY_PER_LINE} unidades del mismo producto` };
      }

      normalized.set(key, { productId, variantId, quantity: total });
    }
    const lines = [...normalized.values()];

    // ── 3. Precios reales, leídos de la base ─────────────────
    const products = await db.product.findMany({
      where: { id: { in: lines.map((l) => l.productId) } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        freeShipping: true,
        images: { where: { isMain: true }, select: { url: true }, take: 1 },
        variants: {
          select: { id: true, name: true, value: true, price: true, stock: true, isActive: true },
        },
      },
    });

    const productById = new Map(products.map((p) => [p.id, p]));
    const pricedLines: PricedLine[] = [];

    for (const line of lines) {
      const product = productById.get(line.productId);

      if (!product || !product.isActive) {
        throw new CheckoutError("Uno de los productos ya no está disponible. Revisá tu carrito.");
      }

      let unitPrice = Number(product.price);
      let displayName = product.name;
      let availableStock = product.stock;

      if (line.variantId) {
        const variant = product.variants.find((v) => v.id === line.variantId);
        if (!variant || !variant.isActive) {
          throw new CheckoutError(`La variante elegida de "${product.name}" ya no está disponible.`);
        }
        // La variante puede tener precio propio; si no, hereda el del producto.
        if (variant.price !== null) unitPrice = Number(variant.price);
        displayName = `${product.name} – ${variant.name}: ${variant.value}`;
        availableStock = variant.stock;
      }

      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw new CheckoutError(`El producto "${product.name}" no tiene un precio válido.`);
      }

      if (availableStock < line.quantity) {
        throw new CheckoutError(
          availableStock <= 0
            ? `"${displayName}" se quedó sin stock.`
            : `Solo quedan ${availableStock} unidades de "${displayName}".`
        );
      }

      pricedLines.push({
        productId: product.id,
        variantId: line.variantId,
        name: displayName,
        image: product.images[0]?.url ?? null,
        unitPrice: round2(unitPrice),
        quantity: line.quantity,
        subtotal: round2(unitPrice * line.quantity),
      });
    }

    const itemsSubtotal = round2(pricedLines.reduce((s, l) => s + l.subtotal, 0));

    // ── 4. Envío: se recotiza en el servidor, siempre en PESOS ─
    // El envío lo cobra un transportista argentino en ARS, así que nunca se
    // convierte a dólares ni se suma al subtotal en moneda base.
    const shippingQuote = await quoteShipping({
      postalCode: shippingParsed.data.postalCode,
      items: pricedLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      declaredValueArs: Math.round(itemsSubtotal * (await getExchangeRate()).rate),
    });

    const shippingOption = shippingQuote.options.find((o) => o.id === input.shippingOptionId);

    if (!shippingOption) {
      throw new CheckoutError(
        "La opción de envío seleccionada ya no está disponible para ese código postal. Volvé a elegirla."
      );
    }

    // Envío sin cargo si todos los productos lo tienen marcado.
    const allFreeShipping = pricedLines.every((l) => productById.get(l.productId)?.freeShipping);
    const shippingCostArs = allFreeShipping ? 0 : shippingOption.priceArs;

    // ── 5. Cupón: se revalida y se recalcula el descuento ────
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let discount = 0;

    if (input.couponCode?.trim()) {
      const result = await validateCoupon({
        code: input.couponCode,
        subtotal: itemsSubtotal,
        userId: user.id,
      });

      if (!result.valid) throw new CheckoutError(result.message);

      couponId = result.couponId;
      couponCode = result.code;
      discount = result.discount;
    }

    // ── 6. Totales definitivos ───────────────────────────────
    const [config, rate] = await Promise.all([getPricingConfig(), getExchangeRate()]);

    const totals = await computeTotals({
      lines: pricedLines,
      shippingCostArs,
      discount,
      paymentOption: input.paymentOption,
      config,
      rate,
    });

    // ── 7. Persistencia atómica ──────────────────────────────
    const shipping = shippingParsed.data;

    const order = await db.$transaction(async (tx) => {
      // Descuento de stock condicional: `updateMany` con `stock >= cantidad`
      // resuelve la carrera de dos compras simultáneas del último artículo.
      // Si `count` es 0, otro pedido se adelantó y se aborta la transacción.
      for (const line of pricedLines) {
        if (line.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: { id: line.variantId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updated.count === 0) {
            throw new CheckoutError(`"${line.name}" se quedó sin stock mientras completabas la compra.`);
          }
          await tx.product.update({
            where: { id: line.productId },
            data: { salesCount: { increment: line.quantity } },
          });
        } else {
          const updated = await tx.product.updateMany({
            where: { id: line.productId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity }, salesCount: { increment: line.quantity } },
          });
          if (updated.count === 0) {
            throw new CheckoutError(`"${line.name}" se quedó sin stock mientras completabas la compra.`);
          }
        }
      }

      // Reintento acotado por si el número de pedido colisiona.
      let created = null;
      for (let attempt = 0; attempt < 5 && created === null; attempt++) {
        const orderNumber = buildOrderNumber();
        try {
          created = await tx.order.create({
            data: {
              userId: user.id,
              orderNumber,
              status: "PENDING",
              paymentStatus: "PENDING",
              paymentMethod: paymentOption.method,
              currency: config.baseCurrency,
              exchangeRate: new Prisma.Decimal(totals.exchangeRate),
              subtotal: new Prisma.Decimal(totals.itemsSubtotal),
              // Envío en PESOS, siempre. No participa de `total`, que está en
              // moneda base: son monedas distintas y no se suman.
              shippingCost: new Prisma.Decimal(totals.shippingCostArs),
              discount: new Prisma.Decimal(totals.discount),
              surchargePercent: new Prisma.Decimal(totals.surchargePercent),
              surchargeAmount: new Prisma.Decimal(totals.surchargeAmount),
              // Mercadería + recargo, en moneda base. Sin envío.
              total: new Prisma.Decimal(totals.total),
              // Gran total en pesos: mercadería convertida + envío.
              totalArs: new Prisma.Decimal(totals.grandTotalArs),
              couponId,
              couponCode,
              notes: input.notes?.slice(0, 1000) || null,
              shippingMethod: shippingOption.serviceName,
              shippingCarrier: shippingOption.providerName,
              shippingProvider: shippingOption.providerId,
              shippingQuotedCp: shippingQuote.postalCode || null,
              shippingName: `${shipping.firstName} ${shipping.lastName}`,
              shippingStreet: `${shipping.street} ${shipping.number}${shipping.apartment ? ` ${shipping.apartment}` : ""}`,
              shippingCity: shipping.city,
              shippingProvince: shipping.province,
              shippingPostal: shipping.postalCode,
              shippingPhone: shipping.phone,
              items: {
                create: pricedLines.map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId ?? null,
                  name: l.name,
                  image: l.image,
                  price: new Prisma.Decimal(l.unitPrice),
                  quantity: l.quantity,
                  subtotal: new Prisma.Decimal(l.subtotal),
                })),
              },
              history: {
                create: {
                  status: "PENDING",
                  note: `Pedido creado. Medio de pago: ${paymentOption.label}.`,
                  notified: false,
                },
              },
            },
            select: { id: true, orderNumber: true },
          });
        } catch (error) {
          const isDuplicateOrderNumber =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
          if (!isDuplicateOrderNumber) throw error;
        }
      }

      if (created === null) {
        throw new CheckoutError("No pudimos generar el número de pedido. Intentá nuevamente.");
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      return created;
    });

    // ── 8. Cobro ─────────────────────────────────────────────
    let redirectUrl: string | undefined;

    if (paymentOption.online) {
      try {
        const mpResult = await createCheckoutPreference({
          orderId: order.id,
          orderNumber: order.orderNumber,
          // Mercado Pago cobra en pesos: la mercadería se convierte con la
          // cotización, pero el envío YA está en pesos y se manda tal cual.
          totalArs: totals.grandTotalArs,
          items: pricedLines.map((l) => ({
            id: l.productId,
            title: l.name.substring(0, 250),
            quantity: l.quantity,
            unitPriceArs: Math.round(l.unitPrice * totals.exchangeRate),
            picture_url: l.image ?? undefined,
          })),
          shippingCostArs: totals.shippingCostArs,
          discountArs: Math.round(totals.discount * totals.exchangeRate),
          surchargeArs: Math.round(totals.surchargeAmount * totals.exchangeRate),
          payer: {
            name: shipping.firstName,
            surname: shipping.lastName,
            email: shipping.email,
            phone: shipping.phone,
          },
        });

        redirectUrl = mpResult.initPoint;

        await db.order.update({
          where: { id: order.id },
          data: { preferenceId: mpResult.preferenceId },
        });
      } catch (error) {
        console.error("[createOrder] Falló la creación de la preferencia de MP:", error);
        // El pedido ya existe y el stock está reservado: se deja en pendiente y
        // se le avisa al cliente, en vez de perder la compra en silencio.
        await db.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "PENDING",
            note: "No se pudo generar el link de pago de Mercado Pago.",
          },
        }).catch(() => {});

        return {
          success: false,
          error:
            "Tu pedido se registró pero no pudimos abrir Mercado Pago. Escribinos por WhatsApp con el número " +
            order.orderNumber,
        };
      }
    }

    // ── 9. Notificaciones ────────────────────────────────────
    // El importe a abonar se comunica igual que en el checkout: en pesos es un
    // único número; en dólares, la mercadería y el envío van separados porque
    // el envío se paga en pesos.
    const goodsLabel = formatMoney(totals.totalCharged, totals.chargeCurrency);
    const shippingLabel = formatMoney(totals.shippingCostArs, "ARS");

    const totalLabel =
      totals.chargeCurrency === "ARS"
        ? formatMoney(totals.grandTotalArs, "ARS")
        : totals.shippingCostArs === 0
          ? goodsLabel
          : `${goodsLabel} + ${shippingLabel} de envío`;

    await sendOrderConfirmation(
      user.email,
      order.orderNumber,
      totalLabel,
      pricedLines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        price: formatMoney(
          totals.chargeCurrency === "ARS"
            ? Math.round(l.subtotal * totals.exchangeRate)
            : l.subtotal,
          totals.chargeCurrency
        ),
      }))
    );

    // En los medios coordinados el cliente necesita los datos para pagar.
    if (!paymentOption.online && paymentOption.instructionsSettingKey) {
      const setting = await db.siteSetting.findUnique({
        where: { key: paymentOption.instructionsSettingKey },
      });

      await sendPaymentInstructions({
        email: user.email,
        orderNumber: order.orderNumber,
        methodLabel: paymentOption.label,
        amountLabel: totalLabel,
        instructions:
          setting?.value?.trim() ||
          "Nos vamos a comunicar a la brevedad para coordinar el pago y la entrega.",
      });
    }

    revalidatePath("/profile/orders");
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        redirectUrl,
        requiresManualPayment: !paymentOption.online,
      },
    };
  } catch (error) {
    if (error instanceof CheckoutError) {
      return { success: false, error: error.message };
    }
    if (error instanceof AuthError) {
      return { success: false, error: error.message };
    }
    return toActionError(error, "Error al crear el pedido. Intentá nuevamente.");
  }
}

/**
 * Cancela un pedido propio y devuelve el stock reservado.
 * Solo se permite mientras el pago siga pendiente.
 */
export async function cancelOwnOrder(orderId: string): Promise<ActionResult> {
  try {
    const user = await requireVerifiedUser();

    const order = await db.order.findFirst({
      where: { id: orderId, userId: user.id },
      select: { id: true, status: true, paymentStatus: true, items: true },
    });

    if (!order) return { success: false, error: "Pedido no encontrado" };

    if (order.paymentStatus === "APPROVED") {
      return {
        success: false,
        error: "El pedido ya fue pagado. Escribinos para gestionar la devolución.",
      };
    }
    if (order.status === "CANCELLED") {
      return { success: false, error: "El pedido ya estaba cancelado" };
    }
    if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
      return { success: false, error: "El pedido ya fue despachado y no se puede cancelar" };
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      // Se devuelve el stock reservado al cancelar.
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

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELLED",
          note: "Cancelado por el cliente.",
          changedBy: user.email,
        },
      });
    });

    revalidatePath("/profile/orders");
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    return toActionError(error, "No pudimos cancelar el pedido");
  }
}
