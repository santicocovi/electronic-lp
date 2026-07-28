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
  /**
   * Precio unitario en PESOS fijado por el administrador (`Product.priceArs`).
   * Si está presente manda sobre la conversión por cotización, tanto en el
   * catálogo como acá. null = convertir con el dólar del día.
   */
  unitPriceArs?: number | null;
  quantity: number;
  subtotal: number;
}

export interface OrderTotals {
  /** Moneda de los importes de mercadería (`itemsSubtotal`, `discount`, `total`). */
  baseCurrency: "USD" | "ARS";
  /** Moneda en la que se cobra la mercadería, según el medio de pago. */
  chargeCurrency: "USD" | "ARS";
  itemsSubtotal: number;
  /**
   * Subtotal de la mercadería en PESOS, armado línea por línea: cada producto
   * usa su precio fijo en pesos si lo tiene y, si no, la conversión. Es lo que
   * garantiza que el total del checkout coincida con los precios del catálogo.
   */
  itemsSubtotalArs: number;
  discount: number;
  /** El mismo descuento, expresado en pesos. */
  discountArs: number;
  /** Base sobre la que se aplica el recargo (items − descuento). Sin envío. */
  netBeforeSurcharge: number;
  surchargePercent: number;
  surchargeAmount: number;
  /** El recargo del medio de pago, expresado en pesos. */
  surchargeAmountArs: number;
  /**
   * Total de la MERCADERÍA en moneda base, con recargo incluido.
   * No incluye el envío, que va aparte porque está en otra moneda.
   */
  total: number;
  /** Total de la mercadería en la moneda de cobro del medio elegido. */
  totalCharged: number;
  /**
   * Costo del envío en PESOS ARGENTINOS. Nunca se convierte a dólares ni se
   * suma a `total`: los transportistas argentinos facturan en ARS.
   */
  shippingCostArs: number;
  /**
   * Gran total en pesos: mercadería convertida a ARS + envío.
   * Es lo que se cobra cuando el medio de pago opera en pesos.
   */
  grandTotalArs: number;
  exchangeRate: number;
  rateSource: ExchangeRate["source"];
  rateUpdatedAt: Date;
}

export interface ComputeTotalsInput {
  lines: PricedLine[];
  /** Costo del envío en PESOS ARGENTINOS. */
  shippingCostArs: number;
  discount: number;
  paymentOption: PaymentOptionKey;
  config?: PricingConfig;
  rate?: ExchangeRate;
}

/**
 * Precio unitario de una línea expresado en pesos.
 * Usa el precio fijo del administrador si existe; si no, convierte.
 */
function lineUnitPriceArs(
  line: PricedLine,
  baseCurrency: "USD" | "ARS",
  rate: number
): number {
  if (baseCurrency === "ARS") return line.unitPrice;
  if (line.unitPriceArs != null && line.unitPriceArs > 0) return line.unitPriceArs;
  return line.unitPrice * rate;
}

/**
 * Subtotal de la mercadería en pesos, sin descuentos ni recargos.
 * Se usa, por ejemplo, para declarar el valor asegurado ante el transportista.
 */
export function computeItemsSubtotalArs(
  lines: PricedLine[],
  baseCurrency: "USD" | "ARS",
  rate: number
): number {
  return roundArs(
    lines.reduce((sum, l) => sum + lineUnitPriceArs(l, baseCurrency, rate) * l.quantity, 0)
  );
}

/**
 * Calcula el total definitivo de un pedido.
 *
 * Separación de monedas (corrige un error real: antes el envío en pesos se
 * sumaba al subtotal en dólares, produciendo totales sin sentido como
 * 1200 USD + 4500 ARS = 5700):
 *
 *   · La mercadería se expresa en la moneda base (USD) y se convierte a la
 *     moneda del medio de pago elegido.
 *   · El envío queda SIEMPRE en ARS, como importe independiente.
 *   · El recargo del medio de pago se aplica solo sobre la mercadería: el envío
 *     lo cobra un tercero y no corresponde recargarlo.
 *
 * Doble contabilidad USD/ARS: el importe en pesos NO se obtiene convirtiendo el
 * total en dólares al final, sino sumando línea por línea el precio en pesos de
 * cada producto (fijo si el administrador lo cargó, convertido si no). Sin esto,
 * un producto con precio en pesos fijado a mano mostraba un número en el
 * catálogo y otro distinto en el checkout.
 */
export async function computeTotals(input: ComputeTotalsInput): Promise<OrderTotals> {
  const config = input.config ?? (await getPricingConfig());
  const rate = input.rate ?? (await getExchangeRate());
  const option = PAYMENT_OPTIONS[input.paymentOption];

  const itemsSubtotal = round2(input.lines.reduce((sum, l) => sum + l.subtotal, 0));

  const itemsSubtotalArs = roundArs(
    input.lines.reduce(
      (sum, l) => sum + lineUnitPriceArs(l, config.baseCurrency, rate.rate) * l.quantity,
      0
    )
  );

  // El envío se normaliza pero no participa de la aritmética en moneda base.
  const shippingCostArs = roundArs(Math.max(0, input.shippingCostArs));

  // El descuento aplica sobre la mercadería y nunca la deja en negativo.
  const discount = round2(Math.min(Math.max(0, input.discount), itemsSubtotal));

  // El descuento se traslada a pesos con la misma proporción que representa
  // sobre la mercadería, así funciona igual con precios fijos y convertidos.
  const discountRatio = itemsSubtotal > 0 ? discount / itemsSubtotal : 0;
  const discountArs = roundArs(itemsSubtotalArs * discountRatio);

  const netBeforeSurcharge = round2(itemsSubtotal - discount);
  const netBeforeSurchargeArs = Math.max(0, itemsSubtotalArs - discountArs);

  const surchargePercent = config.surcharges[input.paymentOption];
  const surchargeAmount = round2((netBeforeSurcharge * surchargePercent) / 100);
  const surchargeAmountArs = roundArs((netBeforeSurchargeArs * surchargePercent) / 100);

  const total = round2(netBeforeSurcharge + surchargeAmount);
  const goodsArs = roundArs(netBeforeSurchargeArs + surchargeAmountArs);

  // Importe de la mercadería en la moneda en la que efectivamente se cobra.
  const totalCharged =
    option.currency === "ARS"
      ? goodsArs
      : config.baseCurrency === "USD"
        ? total
        : round2(total / rate.rate);

  const grandTotalArs = roundArs(goodsArs + shippingCostArs);

  return {
    baseCurrency: config.baseCurrency,
    chargeCurrency: option.currency,
    itemsSubtotal,
    itemsSubtotalArs,
    discount,
    discountArs,
    netBeforeSurcharge,
    surchargePercent,
    surchargeAmount,
    surchargeAmountArs,
    total,
    totalCharged,
    shippingCostArs,
    grandTotalArs,
    exchangeRate: rate.rate,
    rateSource: rate.source,
    rateUpdatedAt: rate.updatedAt,
  };
}

/*
 * Se eliminaron `formatArs` y `convertForDisplay`: no los usaba nadie. El
 * formateo pasa por `formatMoney(amount, "ARS")` y la conversión para mostrar
 * precios vive en el hook `useCurrency`, que es donde se conoce la moneda
 * elegida por el visitante y el precio fijo en pesos de cada producto.
 */

/** Formatea un importe en la moneda indicada, con el locale argentino. */
export function formatMoney(amount: number, currency: "USD" | "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "ARS" ? 0 : 2,
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
  }).format(amount);
}
