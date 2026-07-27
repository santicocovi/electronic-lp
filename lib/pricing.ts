import { db } from "@/lib/db";
import { getExchangeRate, type ExchangeRate } from "@/lib/currency";

/**
 * Motor de precios de Electronic LP.
 *
 * Los precios de catálogo se guardan en la moneda base (USD por defecto,
 * configurable con el ajuste `base_currency`). Todo lo demás — conversión a
 * pesos, recargos por medio de pago, envío y descuentos — se deriva acá, en el
 * servidor. El cliente nunca decide un importe: solo elige un medio de pago.
 *
 * Regla de oro: cualquier total que se cobre o se guarde tiene que salir de
 * `computeTotals()`. Nunca de un número que haya viajado desde el navegador.
 */

// ─── Configuración de medios de pago ──────────────────────────

/** Opción de pago que ve el cliente en el checkout. */
export type PaymentOptionKey = "CASH_USD" | "CASH_ARS" | "TRANSFER" | "MERCADOPAGO" | "USDT";

export interface PaymentOption {
  key: PaymentOptionKey;
  /** Valor del enum PaymentMethod que se guarda en el pedido. */
  method: "CASH" | "TRANSFER" | "MERCADOPAGO" | "USDT";
  /** Moneda en la que se cobra efectivamente. */
  currency: "USD" | "ARS";
  label: string;
  shortLabel: string;
  description: string;
  /** Recargo por defecto, en porcentaje. Se puede sobrescribir desde el panel. */
  defaultSurcharge: number;
  /** Ajuste de SiteSetting que permite cambiar el recargo sin tocar código. */
  surchargeSettingKey: string;
  /** true si el cobro se procesa online (Mercado Pago); false si es coordinado. */
  online: boolean;
  /** Ajuste con las instrucciones que se le envían al cliente por email. */
  instructionsSettingKey?: string;
}

export const PAYMENT_OPTIONS: Record<PaymentOptionKey, PaymentOption> = {
  CASH_USD: {
    key: "CASH_USD",
    method: "CASH",
    currency: "USD",
    label: "Dólares estadounidenses (efectivo)",
    shortLabel: "Dólares",
    description:
      "Únicamente billetes de cara grande, sin roturas ni manchas. Sin excepciones. Se coordina la entrega con el vendedor.",
    defaultSurcharge: 0,
    surchargeSettingKey: "surcharge_cash_usd",
    online: false,
    instructionsSettingKey: "payment_instructions_cash",
  },
  CASH_ARS: {
    key: "CASH_ARS",
    method: "CASH",
    currency: "ARS",
    label: "Pesos argentinos (efectivo)",
    shortLabel: "Pesos",
    description:
      "Se toma la cotización del dólar blue del día con un 10% sobre el valor de venta. Se coordina la entrega con el vendedor.",
    defaultSurcharge: 10,
    surchargeSettingKey: "surcharge_cash_ars",
    online: false,
    instructionsSettingKey: "payment_instructions_cash",
  },
  TRANSFER: {
    key: "TRANSFER",
    method: "TRANSFER",
    currency: "ARS",
    label: "Transferencia bancaria",
    shortLabel: "Transferencia",
    description: "Transferencia en pesos a nuestra cuenta. Recargo del 5%.",
    defaultSurcharge: 5,
    surchargeSettingKey: "surcharge_transfer",
    online: false,
    instructionsSettingKey: "payment_instructions_transfer",
  },
  MERCADOPAGO: {
    key: "MERCADOPAGO",
    method: "MERCADOPAGO",
    currency: "ARS",
    label: "Mercado Pago",
    shortLabel: "Mercado Pago",
    description:
      "Tarjeta de crédito o débito, dinero en cuenta y financiación en cuotas. También permite comprar con crédito presentando DNI.",
    defaultSurcharge: 0,
    surchargeSettingKey: "surcharge_mercadopago",
    online: true,
  },
  USDT: {
    key: "USDT",
    method: "USDT",
    currency: "USD",
    label: "USDT (criptomoneda)",
    shortLabel: "USDT",
    description: "Transferencia en USDT. Sin recargo.",
    defaultSurcharge: 0,
    surchargeSettingKey: "surcharge_usdt",
    online: false,
    instructionsSettingKey: "payment_instructions_usdt",
  },
};

export const PAYMENT_OPTION_KEYS = Object.keys(PAYMENT_OPTIONS) as PaymentOptionKey[];

export function isPaymentOptionKey(value: unknown): value is PaymentOptionKey {
  return typeof value === "string" && value in PAYMENT_OPTIONS;
}

// ─── Utilidades de dinero ─────────────────────────────────────

/**
 * Redondea a 2 decimales operando en centavos enteros, para evitar el arrastre
 * de error de los flotantes (0.1 + 0.2 !== 0.3).
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Redondea pesos a la unidad: nadie cobra centavos de peso. */
export function roundArs(value: number): number {
  return Math.round(value);
}

// ─── Configuración de la tienda ───────────────────────────────

export interface PricingConfig {
  baseCurrency: "USD" | "ARS";
  surcharges: Record<PaymentOptionKey, number>;
  /** Umbral de envío gratis, expresado en la moneda base. */
  freeShippingFrom: number | null;
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const keys = [
    "base_currency",
    "freeShippingFrom",
    ...PAYMENT_OPTION_KEYS.map((k) => PAYMENT_OPTIONS[k].surchargeSettingKey),
  ];

  let map: Record<string, string> = {};
  try {
    const rows = await db.siteSetting.findMany({ where: { key: { in: keys } } });
    map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch (error) {
    console.error("[pricing] No se pudo leer la configuración, se usan defaults:", error);
  }

  const surcharges = {} as Record<PaymentOptionKey, number>;
  for (const key of PAYMENT_OPTION_KEYS) {
    const option = PAYMENT_OPTIONS[key];
    const raw = Number(map[option.surchargeSettingKey]);
    // Se acepta 0 pero se rechazan valores no numéricos o negativos.
    surcharges[key] = Number.isFinite(raw) && raw >= 0 ? raw : option.defaultSurcharge;
  }

  const freeShippingRaw = Number(map.freeShippingFrom);

  return {
    baseCurrency: map.base_currency === "ARS" ? "ARS" : "USD",
    surcharges,
    freeShippingFrom: Number.isFinite(freeShippingRaw) && freeShippingRaw > 0 ? freeShippingRaw : null,
  };
}

// ─── Cálculo de totales ───────────────────────────────────────

export interface PricedLine {
  productId: string;
  variantId?: string | null;
  name: string;
  image: string | null;
  /** Precio unitario en moneda base, resuelto contra la base de datos. */
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderTotals {
  /** Moneda de los importes base (`items`, `subtotal`, `discount`, `total`). */
  baseCurrency: "USD" | "ARS";
  /** Moneda en la que se cobra realmente, según el medio de pago. */
  chargeCurrency: "USD" | "ARS";
  itemsSubtotal: number;
  shippingCost: number;
  discount: number;
  /** Base sobre la que se aplica el recargo (items + envío − descuento). */
  netBeforeSurcharge: number;
  surchargePercent: number;
  surchargeAmount: number;
  /** Total en moneda base, con recargo incluido. */
  total: number;
  /** Total en la moneda de cobro. Si chargeCurrency es ARS, va convertido. */
  totalCharged: number;
  exchangeRate: number;
  rateSource: ExchangeRate["source"];
  rateUpdatedAt: Date;
}

export interface ComputeTotalsInput {
  lines: PricedLine[];
  shippingCost: number;
  discount: number;
  paymentOption: PaymentOptionKey;
  config?: PricingConfig;
  rate?: ExchangeRate;
}

/**
 * Calcula el total definitivo de un pedido.
 *
 * El recargo del medio de pago se aplica sobre (items + envío − descuento),
 * no solo sobre los items: el recargo cubre el costo de cobrar el total.
 */
export async function computeTotals(input: ComputeTotalsInput): Promise<OrderTotals> {
  const config = input.config ?? (await getPricingConfig());
  const rate = input.rate ?? (await getExchangeRate());
  const option = PAYMENT_OPTIONS[input.paymentOption];

  const itemsSubtotal = round2(input.lines.reduce((sum, l) => sum + l.subtotal, 0));
  const shippingCost = round2(Math.max(0, input.shippingCost));

  // El descuento nunca puede superar items + envío (evita totales negativos).
  const discount = round2(Math.min(Math.max(0, input.discount), itemsSubtotal + shippingCost));

  const netBeforeSurcharge = round2(itemsSubtotal + shippingCost - discount);
  const surchargePercent = config.surcharges[input.paymentOption];
  const surchargeAmount = round2((netBeforeSurcharge * surchargePercent) / 100);
  const total = round2(netBeforeSurcharge + surchargeAmount);

  // Conversión a la moneda de cobro.
  let totalCharged: number;
  if (option.currency === config.baseCurrency) {
    totalCharged = total;
  } else if (option.currency === "ARS") {
    totalCharged = roundArs(total * rate.rate);
  } else {
    totalCharged = round2(total / rate.rate);
  }

  return {
    baseCurrency: config.baseCurrency,
    chargeCurrency: option.currency,
    itemsSubtotal,
    shippingCost,
    discount,
    netBeforeSurcharge,
    surchargePercent,
    surchargeAmount,
    total,
    totalCharged,
    exchangeRate: rate.rate,
    rateSource: rate.source,
    rateUpdatedAt: rate.updatedAt,
  };
}

// ─── Conversión para mostrar precios en el catálogo ───────────

/**
 * Convierte un precio de catálogo a la moneda que el visitante eligió ver.
 * Es solo presentación: el precio que se cobra sale siempre de computeTotals().
 */
export function convertForDisplay(
  amount: number,
  from: "USD" | "ARS",
  to: "USD" | "ARS",
  rate: number
): number {
  if (from === to) return to === "ARS" ? roundArs(amount) : round2(amount);
  if (to === "ARS") return roundArs(amount * rate);
  return round2(amount / rate);
}

/** Formatea un importe en la moneda indicada, con el locale argentino. */
export function formatMoney(amount: number, currency: "USD" | "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "ARS" ? 0 : 2,
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
  }).format(amount);
}
