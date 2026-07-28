import { provinceFromPostalCode } from "@/lib/shipping/postal-codes";
import {
  ShippingQuoteError,
  type ShippingProvider,
  type ShippingQuoteOption,
  type ShippingQuoteRequest,
} from "@/lib/shipping/types";

/**
 * Cotización con Andreani (API de e-commerce).
 *
 * Flujo de la API:
 *   1. POST {BASE}/login con Basic auth (usuario:contraseña en base64).
 *      Devuelve el token en el header `x-authorization-token`.
 *   2. GET {BASE}/v1/tarifas con el token en el header `x-authorization-token`.
 *
 * Requiere un contrato comercial con Andreani. Ver la guía de configuración al
 * final del trabajo: hacen falta usuario, contraseña, número de contrato y el
 * código postal de origen.
 *
 * IMPORTANTE: esta integración está escrita contra la especificación pública de
 * Andreani pero NO fue probada contra la API real por falta de credenciales.
 * Si la respuesta viniera con otra forma, el orquestador cae solo en las tarifas
 * de tabla, así que el checkout nunca se rompe.
 */

const BASE_URL = process.env.ANDREANI_API_URL ?? "https://apis.andreani.com";
const TOKEN_TTL_MS = 10 * 60 * 1000; // El token de Andreani dura ~15 min.

let cachedToken: { value: string; expiresAt: number } | null = null;

function requiredEnv() {
  return {
    user: process.env.ANDREANI_USER,
    password: process.env.ANDREANI_PASSWORD,
    contract: process.env.ANDREANI_CONTRACT,
    originPostalCode: process.env.ANDREANI_ORIGIN_CP ?? "1900",
    /** Cliente/sucursal de origen, opcional según el contrato. */
    client: process.env.ANDREANI_CLIENT,
  };
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const { user, password } = requiredEnv();
  const credentials = Buffer.from(`${user}:${password}`).toString("base64");

  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new ShippingQuoteError(
      "andreani",
      `Login rechazado (HTTP ${response.status}). Revisá ANDREANI_USER y ANDREANI_PASSWORD.`
    );
  }

  // El token llega por header; algunos entornos lo devuelven también en el body.
  const headerToken = response.headers.get("x-authorization-token");
  const bodyToken = await response
    .json()
    .then((body: { token?: string }) => body?.token)
    .catch(() => undefined);

  const token = headerToken ?? bodyToken;
  if (!token) {
    throw new ShippingQuoteError("andreani", "El login no devolvió token.");
  }

  cachedToken = { value: token, expiresAt: now + TOKEN_TTL_MS };
  return token;
}

/** Respuesta de /v1/tarifas. Los nombres varían por versión de contrato. */
interface AndreaniTarifaResponse {
  tarifaConIva?: { total?: number | string };
  tarifaSinIva?: { total?: number | string };
  total?: number | string;
  pesoAforado?: number;
  plazoEntrega?: string | number;
}

/** Extrae el importe con IVA, tolerando las variantes de la respuesta. */
function extractPrice(payload: AndreaniTarifaResponse): number | null {
  const candidates = [
    payload.tarifaConIva?.total,
    payload.total,
    payload.tarifaSinIva?.total,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }

  return null;
}

export const andreaniProvider: ShippingProvider = {
  id: "andreani",
  name: "Andreani",

  isConfigured() {
    const { user, password, contract } = requiredEnv();
    return Boolean(user && password && contract);
  },

  async quote(request: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const { contract, originPostalCode, client } = requiredEnv();
    const token = await getToken();

    // Andreani cotiza por bulto. Se manda un bulto con el total del pedido.
    const params = new URLSearchParams({
      contrato: contract!,
      cpDestino: request.postalCode,
      cpOrigen: originPostalCode,
      "bultos[0][valorDeclarado]": String(Math.round(request.declaredValueArs)),
      "bultos[0][kilos]": String(Math.max(0.1, request.weightKg).toFixed(2)),
      "bultos[0][volumen]": String(Math.round(request.volumeCm3 ?? 1000)),
    });

    if (client) params.set("cliente", client);

    const response = await fetch(`${BASE_URL}/v1/tarifas?${params.toString()}`, {
      headers: {
        "x-authorization-token": token,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401) {
      // Token vencido antes de lo previsto: se descarta para reintentar limpio.
      cachedToken = null;
      throw new ShippingQuoteError("andreani", "Token rechazado (401).");
    }

    if (!response.ok) {
      throw new ShippingQuoteError(
        "andreani",
        `Cotización rechazada (HTTP ${response.status}) para el CP ${request.postalCode}.`
      );
    }

    const payload = (await response.json()) as AndreaniTarifaResponse;
    const price = extractPrice(payload);

    if (price === null) {
      throw new ShippingQuoteError(
        "andreani",
        "La respuesta no incluyó una tarifa utilizable."
      );
    }

    const days = payload.plazoEntrega ? String(payload.plazoEntrega) : null;

    return [
      {
        id: `andreani:domicilio`,
        providerId: "andreani",
        providerName: "Andreani",
        serviceName: "Andreani a domicilio",
        priceArs: Math.round(price),
        estimatedDays: days ? `${days} días hábiles` : "2-5 días hábiles",
        description: `Envío a ${provinceFromPostalCode(request.postalCode)} con seguimiento.`,
      },
    ];
  },
};
