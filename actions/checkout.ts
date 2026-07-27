"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-guard";
import { validateCoupon } from "@/lib/coupons";
import {
  computeTotals,
  getPricingConfig,
  isPaymentOptionKey,
  PAYMENT_OPTIONS,
  PAYMENT_OPTION_KEYS,
  round2,
  type PaymentOptionKey,
  type PricedLine,
} from "@/lib/pricing";
import { getExchangeRate } from "@/lib/currency";
import type { ActionResult } from "@/types";

/**
 * Cotización del checkout.
 *
 * Devuelve el total de cada medio de pago calculado en el servidor, con los
 * mismos precios y reglas que después aplica `createOrder`. El formulario solo
 * muestra estos números: no calcula nada por su cuenta, así lo que ve el
 * cliente es exactamente lo que se va a cobrar.
 */

export interface QuoteLine {
  productId: string;
  variantId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  /** Stock disponible, para avisar en pantalla si algo cambió. */
  availableStock: number;
}

export interface QuoteOption {
  key: PaymentOptionKey;
  label: string;
  shortLabel: string;
  description: string;
  currency: "USD" | "ARS";
  surchargePercent: number;
  surchargeAmount: number;
  /** Total en la moneda de cobro de este medio. */
  total: number;
  totalFormatted: string;
  online: boolean;
}

export interface CheckoutQuote {
  lines: QuoteLine[];
  baseCurrency: "USD" | "ARS";
  itemsSubtotal: number;
  shippingCost: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  exchangeRate: number;
  rateUpdatedAt: string;
  options: QuoteOption[];
  /** Avisos para mostrar en pantalla (stock, productos dados de baja). */
  warnings: string[];
}

interface QuoteInput {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  shippingMethodId?: string;
  couponCode?: string;
}

export async function getCheckoutQuote(input: QuoteInput): Promise<ActionResult<CheckoutQuote>> {
  try {
    const user = await getCurrentUser();

    const warnings: string[] = [];
    const requested = (input.items ?? []).filter(
      (i) => i?.productId && Number.isInteger(i.quantity) && i.quantity > 0
    );

    if (requested.length === 0) {
      return { success: false, error: "El carrito está vacío" };
    }

    const products = await db.product.findMany({
      where: { id: { in: requested.map((i) => i.productId) } },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        freeShipping: true,
        variants: {
          select: { id: true, name: true, value: true, price: true, stock: true, isActive: true },
        },
      },
    });

    const productById = new Map(products.map((p) => [p.id, p]));
    const lines: QuoteLine[] = [];
    const pricedLines: PricedLine[] = [];

    for (const item of requested) {
      const product = productById.get(item.productId);

      if (!product || !product.isActive) {
        warnings.push("Un producto de tu carrito ya no está disponible y fue omitido.");
        continue;
      }

      let unitPrice = Number(product.price);
      let name = product.name;
      let availableStock = product.stock;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant || !variant.isActive) {
          warnings.push(`La variante elegida de "${product.name}" ya no está disponible.`);
          continue;
        }
        if (variant.price !== null) unitPrice = Number(variant.price);
        name = `${product.name} – ${variant.name}: ${variant.value}`;
        availableStock = variant.stock;
      }

      if (availableStock <= 0) {
        warnings.push(`"${name}" se quedó sin stock.`);
        continue;
      }

      // Se recorta la cantidad al stock real en lugar de rechazar el carrito.
      const quantity = Math.min(item.quantity, availableStock);
      if (quantity < item.quantity) {
        warnings.push(`Solo quedan ${availableStock} unidades de "${name}".`);
      }

      const subtotal = round2(unitPrice * quantity);

      lines.push({
        productId: product.id,
        variantId: item.variantId ?? null,
        name,
        unitPrice: round2(unitPrice),
        quantity,
        subtotal,
        availableStock,
      });

      pricedLines.push({
        productId: product.id,
        variantId: item.variantId ?? null,
        name,
        image: null,
        unitPrice: round2(unitPrice),
        quantity,
        subtotal,
      });
    }

    if (pricedLines.length === 0) {
      return { success: false, error: "No hay productos disponibles en tu carrito" };
    }

    const itemsSubtotal = round2(pricedLines.reduce((s, l) => s + l.subtotal, 0));

    // ── Envío ────────────────────────────────────────────────
    let shippingCost = 0;
    if (input.shippingMethodId) {
      const method = await db.shippingMethod.findFirst({
        where: { id: input.shippingMethodId, isActive: true },
      });

      if (method) {
        shippingCost = Number(method.price);
        const freeFrom = method.freeFrom === null ? null : Number(method.freeFrom);
        const allFreeShipping = pricedLines.every(
          (l) => productById.get(l.productId)?.freeShipping
        );
        if ((freeFrom !== null && itemsSubtotal >= freeFrom) || allFreeShipping) {
          shippingCost = 0;
        }
      }
    }

    // ── Cupón ────────────────────────────────────────────────
    let discount = 0;
    let couponCode: string | null = null;
    let couponError: string | null = null;

    if (input.couponCode?.trim()) {
      const result = await validateCoupon({
        code: input.couponCode,
        subtotal: itemsSubtotal,
        userId: user?.id,
      });

      if (result.valid) {
        discount = result.discount;
        couponCode = result.code;
      } else {
        couponError = result.message;
      }
    }

    // ── Totales por medio de pago ────────────────────────────
    const [config, rate] = await Promise.all([getPricingConfig(), getExchangeRate()]);

    const options: QuoteOption[] = [];
    for (const key of PAYMENT_OPTION_KEYS) {
      const totals = await computeTotals({
        lines: pricedLines,
        shippingCost,
        discount,
        paymentOption: key,
        config,
        rate,
      });

      const option = PAYMENT_OPTIONS[key];
      options.push({
        key,
        label: option.label,
        shortLabel: option.shortLabel,
        description: option.description,
        currency: option.currency,
        surchargePercent: totals.surchargePercent,
        surchargeAmount: totals.surchargeAmount,
        total: totals.totalCharged,
        totalFormatted: new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: option.currency,
          minimumFractionDigits: option.currency === "ARS" ? 0 : 2,
          maximumFractionDigits: option.currency === "ARS" ? 0 : 2,
        }).format(totals.totalCharged),
        online: option.online,
      });
    }

    return {
      success: true,
      data: {
        lines,
        baseCurrency: config.baseCurrency,
        itemsSubtotal,
        shippingCost,
        discount,
        couponCode,
        couponError,
        exchangeRate: rate.rate,
        rateUpdatedAt: rate.updatedAt.toISOString(),
        options,
        warnings,
      },
    };
  } catch (error) {
    console.error("[getCheckoutQuote] error:", error);
    return { success: false, error: "No pudimos calcular el total. Recargá la página." };
  }
}

/** Valida una opción de pago recibida del cliente. */
export async function isValidPaymentOption(key: string): Promise<boolean> {
  return isPaymentOptionKey(key);
}
