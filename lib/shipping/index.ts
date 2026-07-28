import { db } from "@/lib/db";
import { andreaniProvider } from "@/lib/shipping/providers/andreani";
import { correoArgentinoProvider } from "@/lib/shipping/providers/correo-argentino";
import { tableProvider } from "@/lib/shipping/providers/table";
import {
  DEFAULT_LOCAL_RANGES,
  isLocalDelivery,
  normalizePostalCode,
  parseRanges,
} from "@/lib/shipping/postal-codes";
import type {
  ShippingProvider,
  ShippingQuoteOption,
  ShippingQuoteRequest,
} from "@/lib/shipping/types";

/**
 * Orquestador de cotización de envíos.
 *
 * Reglas:
 *  · Toda tarifa está en PESOS ARGENTINOS y nunca se convierte a dólares.
 *  · Gran La Plata entrega sin cargo en el día (regla comercial de la tienda).
 *  · Se consultan en paralelo los transportistas configurados; el que falla se
 *    saltea y queda logueado.
 *  · Si ningún transportista responde, se usan las tarifas planas de la tabla,
 *    así el checkout nunca se queda sin poder cotizar.
 *
 * Para cambiar de proveedor alcanza con reordenar o editar PROVIDERS.
 */

/** Orden de preferencia. El primero que responda define el orden en pantalla. */
const PROVIDERS: ShippingProvider[] = [andreaniProvider, correoArgentinoProvider];

/** Peso por defecto de un artículo sin peso cargado, en kilos. */
const DEFAULT_ITEM_WEIGHT_KG = 0.5;

/** Los envíos se cotizan por unos minutos para no golpear las APIs en cada tecla. */
const QUOTE_CACHE_TTL_MS = 10 * 60 * 1000;

const quoteCache = new Map<string, { options: ShippingQuoteOption[]; expiresAt: number }>();

export interface ShippingQuoteResult {
  postalCode: string;
  /** Opciones en ARS, ordenadas de menor a mayor precio. */
  options: ShippingQuoteOption[];
  /** true si el CP está en la zona de entrega propia. */
  isLocal: boolean;
  /** true si todas las opciones salieron de la tabla de respaldo. */
  usedFallback: boolean;
  /** Proveedores que fallaron, para mostrarlo en el panel si hace falta. */
  failedProviders: string[];
}

/** Ítems del pedido tal como los necesita el cálculo de peso. */
export interface ShippingItemInput {
  productId: string;
  quantity: number;
}

/** Calcula el peso total leyendo `Product.weight` de la base. */
async function resolveWeight(items: ShippingItemInput[]): Promise<number> {
  if (items.length === 0) return DEFAULT_ITEM_WEIGHT_KG;

  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, weight: true },
  });

  const weightById = new Map(products.map((p) => [p.id, p.weight]));

  let total = 0;
  for (const item of items) {
    const weight = weightById.get(item.productId);
    const kg = weight === null || weight === undefined ? DEFAULT_ITEM_WEIGHT_KG : Number(weight);
    total += (Number.isFinite(kg) && kg > 0 ? kg : DEFAULT_ITEM_WEIGHT_KG) * item.quantity;
  }

  return Math.max(DEFAULT_ITEM_WEIGHT_KG, total);
}

/** Rangos de entrega propia, configurables desde el panel. */
async function resolveLocalRanges(): Promise<[number, number][]> {
  try {
    const setting = await db.siteSetting.findUnique({
      where: { key: "free_shipping_postal_ranges" },
    });
    return parseRanges(setting?.value) ?? DEFAULT_LOCAL_RANGES;
  } catch {
    return DEFAULT_LOCAL_RANGES;
  }
}

/** Opción de entrega propia sin cargo en el Gran La Plata. */
function localDeliveryOption(): ShippingQuoteOption {
  return {
    id: "local:la-plata",
    providerId: "local",
    providerName: "Electronic LP",
    serviceName: "Entrega en La Plata sin cargo",
    priceArs: 0,
    estimatedDays: "En el día",
    isLocal: true,
    description: "Coordinamos punto y horario de entrega por WhatsApp.",
  };
}

/** Retiro en persona, siempre disponible. */
function pickupOption(): ShippingQuoteOption {
  return {
    id: "local:pickup",
    providerId: "local",
    providerName: "Electronic LP",
    serviceName: "Retiro en persona",
    priceArs: 0,
    estimatedDays: "24-48 horas",
    isLocal: true,
    description: "Te avisamos cuando el pedido esté listo para retirar.",
  };
}

/**
 * Cotiza el envío para un código postal.
 * Nunca lanza: ante cualquier problema devuelve al menos las opciones locales.
 */
export async function quoteShipping(input: {
  postalCode: string;
  items: ShippingItemInput[];
  /** Valor declarado en ARS para el seguro del transportista. */
  declaredValueArs: number;
}): Promise<ShippingQuoteResult> {
  const postalCode = normalizePostalCode(input.postalCode);

  // Sin CP válido solo se puede ofrecer retiro.
  if (!postalCode) {
    return {
      postalCode: "",
      options: [pickupOption()],
      isLocal: false,
      usedFallback: true,
      failedProviders: [],
    };
  }

  const cacheKey = `${postalCode}|${input.items
    .map((i) => `${i.productId}x${i.quantity}`)
    .sort()
    .join(",")}|${Math.round(input.declaredValueArs)}`;

  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    const local = isLocalDelivery(postalCode, await resolveLocalRanges());
    return {
      postalCode,
      options: cached.options,
      isLocal: local,
      usedFallback: cached.options.every((o) => o.isFallback || o.isLocal),
      failedProviders: [],
    };
  }

  const [ranges, weightKg] = await Promise.all([
    resolveLocalRanges(),
    resolveWeight(input.items),
  ]);

  const local = isLocalDelivery(postalCode, ranges);

  // Zona propia: entrega sin cargo, no hace falta consultar transportistas.
  if (local) {
    const options = [localDeliveryOption(), pickupOption()];
    quoteCache.set(cacheKey, { options, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
    return { postalCode, options, isLocal: true, usedFallback: false, failedProviders: [] };
  }

  const request: ShippingQuoteRequest = {
    postalCode,
    weightKg,
    volumeCm3: 1000 * Math.max(1, input.items.reduce((s, i) => s + i.quantity, 0)),
    declaredValueArs: Math.max(0, Math.round(input.declaredValueArs)),
    packages: 1,
  };

  const configured = PROVIDERS.filter((provider) => provider.isConfigured());
  const failedProviders: string[] = [];
  const liveOptions: ShippingQuoteOption[] = [];

  // Se consultan en paralelo: un transportista lento no debe demorar al otro.
  const results = await Promise.allSettled(
    configured.map((provider) => provider.quote(request))
  );

  results.forEach((result, index) => {
    const provider = configured[index];
    if (result.status === "fulfilled") {
      liveOptions.push(...result.value);
    } else {
      failedProviders.push(provider.id);
      console.warn(`[shipping] ${provider.id} no pudo cotizar:`, result.reason);
    }
  });

  // Sin cotización en vivo se usan las tarifas planas de la tabla.
  let options = liveOptions;
  let usedFallback = false;

  if (options.length === 0) {
    if (configured.length === 0) {
      console.info(
        "[shipping] Ningún transportista configurado: se usan las tarifas de tabla."
      );
    }
    try {
      options = (await tableProvider.quote(request)).filter((o) => !o.isLocal);
      usedFallback = true;
    } catch (error) {
      console.error("[shipping] Falló incluso la tarifa de tabla:", error);
      options = [];
    }
  }

  // El retiro en persona siempre se ofrece.
  options = [...options, pickupOption()].sort((a, b) => a.priceArs - b.priceArs);

  quoteCache.set(cacheKey, { options, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });

  return { postalCode, options, isLocal: false, usedFallback, failedProviders };
}

/**
 * Revalida una opción elegida por el cliente antes de cerrar el pedido.
 * Se vuelve a cotizar en el servidor para no confiar en el precio que llegó del
 * navegador: es el mismo criterio que se aplica a los precios de producto.
 */
export async function resolveShippingOption(input: {
  postalCode: string;
  optionId: string;
  items: ShippingItemInput[];
  declaredValueArs: number;
}): Promise<ShippingQuoteOption | null> {
  const quote = await quoteShipping(input);
  return quote.options.find((option) => option.id === input.optionId) ?? null;
}

/** Lista los proveedores y si están configurados, para mostrarlo en el panel. */
export function listShippingProviders() {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    configured: provider.isConfigured(),
  }));
}
