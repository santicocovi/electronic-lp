import { db } from "@/lib/db";

/**
 * Cotización del dólar blue.
 *
 * Fuente: https://dolarapi.com/v1/dolares/blue — API pública argentina,
 * gratuita y sin API key ni registro. Devuelve `compra` y `venta`; se usa
 * `venta` porque es el valor al que la tienda vende.
 *
 * Estrategia de resiliencia (de mayor a menor prioridad):
 *   1. Caché en memoria dentro del TTL.
 *   2. Valor cacheado en SiteSetting dentro del TTL.
 *   3. Consulta a la API y actualización de la caché.
 *   4. Si la API falla: último valor cacheado aunque esté vencido (stale).
 *   5. Si nunca hubo valor: el fallback manual configurado en el panel.
 *
 * Nunca lanza una excepción: una caída de la API externa no puede tumbar el
 * catálogo ni el checkout.
 */

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares/blue";

export const RATE_SETTING_KEY = "usd_blue_rate";
export const RATE_UPDATED_KEY = "usd_blue_updated_at";
export const RATE_FALLBACK_KEY = "usd_blue_fallback";
export const RATE_TTL_KEY = "usd_blue_ttl_minutes";
export const RATE_MODE_KEY = "usd_rate_mode"; // "auto" | "manual"

const DEFAULT_TTL_MINUTES = 60;
/** Solo se usa si la API falla y nunca se guardó una cotización. */
const HARD_FALLBACK_RATE = 1000;

export interface ExchangeRate {
  /** Pesos por dólar (valor de venta). */
  rate: number;
  updatedAt: Date;
  source: "api" | "cache" | "stale-cache" | "manual" | "fallback";
}

let memoryCache: { value: ExchangeRate; expiresAt: number } | null = null;

async function readSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.siteSetting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function writeRate(rate: number, updatedAt: Date) {
  await Promise.all([
    db.siteSetting.upsert({
      where: { key: RATE_SETTING_KEY },
      create: { key: RATE_SETTING_KEY, value: String(rate), group: "currency", type: "number" },
      update: { value: String(rate) },
    }),
    db.siteSetting.upsert({
      where: { key: RATE_UPDATED_KEY },
      create: { key: RATE_UPDATED_KEY, value: updatedAt.toISOString(), group: "currency" },
      update: { value: updatedAt.toISOString() },
    }),
  ]);
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function fetchFromApi(): Promise<number | null> {
  try {
    const res = await fetch(DOLAR_API_URL, {
      // La caché la maneja este módulo, no el fetch de Next.
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`[currency] dolarapi respondió ${res.status}`);
      return null;
    }

    const data = (await res.json()) as { venta?: number; compra?: number };
    const venta = Number(data?.venta);

    if (!isValidRate(venta)) {
      console.warn("[currency] dolarapi devolvió un valor inesperado:", data);
      return null;
    }

    return venta;
  } catch (error) {
    console.warn("[currency] No se pudo consultar dolarapi:", (error as Error).message);
    return null;
  }
}

export async function getExchangeRate(options?: { forceRefresh?: boolean }): Promise<ExchangeRate> {
  const now = Date.now();

  if (!options?.forceRefresh && memoryCache && memoryCache.expiresAt > now) {
    return memoryCache.value;
  }

  let settings: Record<string, string> = {};
  try {
    settings = await readSettings([
      RATE_SETTING_KEY,
      RATE_UPDATED_KEY,
      RATE_FALLBACK_KEY,
      RATE_TTL_KEY,
      RATE_MODE_KEY,
    ]);
  } catch (error) {
    console.error("[currency] No se pudieron leer los ajustes:", error);
  }

  const ttlMinutes = Number(settings[RATE_TTL_KEY]) || DEFAULT_TTL_MINUTES;
  const ttlMs = ttlMinutes * 60 * 1000;
  const cachedRate = Number(settings[RATE_SETTING_KEY]);
  const cachedAt = settings[RATE_UPDATED_KEY] ? new Date(settings[RATE_UPDATED_KEY]) : null;

  // Modo manual: el administrador fija la cotización y no se consulta la API.
  if (settings[RATE_MODE_KEY] === "manual") {
    const manual = Number(settings[RATE_FALLBACK_KEY]);
    const value: ExchangeRate = {
      rate: isValidRate(manual) ? manual : HARD_FALLBACK_RATE,
      updatedAt: cachedAt ?? new Date(),
      source: "manual",
    };
    memoryCache = { value, expiresAt: now + ttlMs };
    return value;
  }

  const cacheIsFresh =
    isValidRate(cachedRate) && cachedAt && now - cachedAt.getTime() < ttlMs;

  if (!options?.forceRefresh && cacheIsFresh) {
    const value: ExchangeRate = { rate: cachedRate, updatedAt: cachedAt, source: "cache" };
    memoryCache = { value, expiresAt: now + ttlMs };
    return value;
  }

  const fresh = await fetchFromApi();

  if (fresh !== null) {
    const updatedAt = new Date();
    await writeRate(fresh, updatedAt).catch((e) =>
      console.error("[currency] No se pudo guardar la cotización:", e)
    );
    const value: ExchangeRate = { rate: fresh, updatedAt, source: "api" };
    memoryCache = { value, expiresAt: now + ttlMs };
    return value;
  }

  // La API falló: se sigue operando con el último valor conocido.
  if (isValidRate(cachedRate) && cachedAt) {
    const value: ExchangeRate = { rate: cachedRate, updatedAt: cachedAt, source: "stale-cache" };
    // TTL corto para reintentar pronto contra la API.
    memoryCache = { value, expiresAt: now + 5 * 60 * 1000 };
    return value;
  }

  const manualFallback = Number(settings[RATE_FALLBACK_KEY]);
  const value: ExchangeRate = {
    rate: isValidRate(manualFallback) ? manualFallback : HARD_FALLBACK_RATE,
    updatedAt: new Date(),
    source: "fallback",
  };
  memoryCache = { value, expiresAt: now + 5 * 60 * 1000 };
  return value;
}

/** Fuerza una actualización desde la API. Se usa desde el panel de administración. */
export async function refreshExchangeRate(): Promise<ExchangeRate> {
  memoryCache = null;
  return getExchangeRate({ forceRefresh: true });
}

/** Limpia la caché en memoria tras un cambio manual de configuración. */
export function invalidateExchangeRateCache() {
  memoryCache = null;
}
