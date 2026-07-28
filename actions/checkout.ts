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
  formatMoney,
  round2,
  roundArs,
  type PaymentOptionKey,
  type PricedLine,
} from "@/lib/pricing";
import { getExchangeRate } from "@/lib/currency";
import { quoteShipping } from "@/lib/shipping";
import type { ShippingQuoteOption } from "@/lib/shipping/types";
import type { ActionResult } from "@/types";

/**
 * Cotización del checkout.
 *
 * Devuelve, calculado en el servidor con los precios de la base:
 *  · las líneas del carrito en moneda base (USD);
 *  · las opciones de envío en PESOS, cotizadas según el código postal;
 *  · el total de cada medio de pago, con mercadería y envío separados.
 *
 * El formulario solo muestra estos números: no calcula nada por su cuenta.
 */

export interface QuoteLine {
  productId: string;
  variantId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  availableStock: number;
}

export interface QuoteShippingOption {
  id: string;
  providerName: string;
  serviceName: string;
  /** Tarifa en PESOS ARGENTINOS. */
  priceArs: number;
  priceArsFormatted: string;
  estimatedDays: string | null;
  description: string | null;
  isLocal: boolean;
  isFallback: boolean;
}

export interface QuoteOption {
  key: PaymentOptionKey;
  label: string;
  shortLabel: string;
  description: string;
  /** Moneda en la que se cobra la mercadería. */
  currency: "USD" | "ARS";
  surchargePercent: number;
  surchargeAmount: number;
  /** Total de la mercadería en la moneda de cobro. */
  goodsTotal: number;
  goodsTotalFormatted: string;
  /** Envío en pesos, siempre independiente de la mercadería. */
  shippingArs: number;
  shippingArsFormatted: string;
  /** Gran total en pesos (mercadería convertida + envío). */
  grandTotalArs: number;
  grandTotalArsFormatted: string;
  /**
   * Cómo se le presenta el total al cliente. En pesos es un único importe;
   * en dólares son dos, porque el envío se paga en pesos y no se convierte.
   */
  payableSummary: string;
  online: boolean;
}

export interface CheckoutQuote {
  lines: QuoteLine[];
  baseCurrency: "USD" | "ARS";
  itemsSubtotal: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  exchangeRate: number;
  rateUpdatedAt: string;
  shippingOptions: QuoteShippingOption[];
  quotedPostalCode: string;
  isLocalDelivery: boolean;
  shippingUsedFallback: boolean;
  selectedShippingId: string | null;
  selectedShippingArs: number;
  options: QuoteOption[];
  warnings: string[];
}

interface QuoteInput {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  postalCode?: string;
  shippingOptionId?: string;
  couponCode?: string;
}

function toQuoteShippingOption(option: ShippingQuoteOption): QuoteShippingOption {
  return {
    id: option.id,
    providerName: option.providerName,
    serviceName: option.serviceName,
    priceArs: option.priceArs,
    priceArsFormatted: option.priceArs === 0 ? "Sin cargo" : formatMoney(option.priceArs, "ARS"),
    estimatedDays: option.estimatedDays,
    description: option.description ?? null,
    isLocal: Boolean(option.isLocal),
    isFallback: Boolean(option.isFallback),
  };
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

    const [config, rate] = await Promise.all([getPricingConfig(), getExchangeRate()]);

    // ── Envío: cotizado en pesos según el código postal ──────
    // El valor declarado va en pesos porque es lo que aseguran los
    // transportistas argentinos.
    const declaredValueArs =
      config.baseCurrency === "ARS" ? roundArs(itemsSubtotal) : roundArs(itemsSubtotal * rate.rate);

    const shippingQuote = await quoteShipping({
      postalCode: input.postalCode ?? "",
      items: pricedLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      declaredValueArs,
    });

    // Envío sin cargo si todos los productos lo tienen marcado.
    const allFreeShipping = pricedLines.every((l) => productById.get(l.productId)?.freeShipping);

    let shippingOptions = shippingQuote.options.map(toQuoteShippingOption);

    if (allFreeShipping) {
      shippingOptions = shippingOptions.map((o) => ({
        ...o,
        priceArs: 0,
        priceArsFormatted: "Sin cargo",
        description: o.description
          ? `${o.description} · Envío sin cargo por promoción.`
          : "Envío sin cargo por promoción.",
      }));
    }

    // La opción elegida se valida contra las disponibles; si ya no está, se
    // toma la más barata en lugar de dejar el checkout sin envío.
    const requestedId = input.shippingOptionId;
    const matched = requestedId ? shippingOptions.find((o) => o.id === requestedId) : undefined;
    const selected = matched ?? shippingOptions[0] ?? null;

    if (requestedId && !matched) {
      warnings.push("La opción de envío elegida ya no está disponible para ese código postal.");
    }

    const selectedShippingArs = selected?.priceArs ?? 0;

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
    const options: QuoteOption[] = [];

    for (const key of PAYMENT_OPTION_KEYS) {
      const totals = await computeTotals({
        lines: pricedLines,
        shippingCostArs: selectedShippingArs,
        discount,
        paymentOption: key,
        config,
        rate,
      });

      const option = PAYMENT_OPTIONS[key];
      const goodsFormatted = formatMoney(totals.totalCharged, totals.chargeCurrency);
      const shippingFormatted =
        totals.shippingCostArs === 0 ? "Sin cargo" : formatMoney(totals.shippingCostArs, "ARS");

      // En pesos es un único importe. En dólares el envío se cobra aparte, en
      // pesos, y se explicita para que el cliente sepa exactamente qué paga.
      const payableSummary =
        totals.chargeCurrency === "ARS"
          ? formatMoney(totals.grandTotalArs, "ARS")
          : totals.shippingCostArs === 0
            ? goodsFormatted
            : `${goodsFormatted} + ${shippingFormatted} de envío`;

      options.push({
        key,
        label: option.label,
        shortLabel: option.shortLabel,
        description: option.description,
        currency: option.currency,
        surchargePercent: totals.surchargePercent,
        surchargeAmount: totals.surchargeAmount,
        goodsTotal: totals.totalCharged,
        goodsTotalFormatted: goodsFormatted,
        shippingArs: totals.shippingCostArs,
        shippingArsFormatted: shippingFormatted,
        grandTotalArs: totals.grandTotalArs,
        grandTotalArsFormatted: formatMoney(totals.grandTotalArs, "ARS"),
        payableSummary,
        online: option.online,
      });
    }

    if (shippingQuote.failedProviders.length > 0) {
      warnings.push(
        "No pudimos consultar la tarifa en vivo del transportista. Se muestra nuestra tarifa de referencia."
      );
    }

    return {
      success: true,
      data: {
        lines,
        baseCurrency: config.baseCurrency,
        itemsSubtotal,
        discount,
        couponCode,
        couponError,
        exchangeRate: rate.rate,
        rateUpdatedAt: rate.updatedAt.toISOString(),
        shippingOptions,
        quotedPostalCode: shippingQuote.postalCode,
        isLocalDelivery: shippingQuote.isLocal,
        shippingUsedFallback: shippingQuote.usedFallback,
        selectedShippingId: selected?.id ?? null,
        selectedShippingArs,
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
