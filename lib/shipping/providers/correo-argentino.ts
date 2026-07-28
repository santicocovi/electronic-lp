import {
  ShippingQuoteError,
  type ShippingProvider,
  type ShippingQuoteOption,
  type ShippingQuoteRequest,
} from "@/lib/shipping/types";

/**
 * Cotización con Correo Argentino (Paq.ar / Mi Correo Empresas).
 *
 * Flujo de la API:
 *   1. POST {BASE}/token con usuario y contraseña → devuelve un bearer token.
 *   2. POST {BASE}/rates con el token → tarifas de "Clásico" y "Expreso",
 *      a domicilio y a sucursal.
 *
 * Requiere convenio con Correo Argentino: el alta se hace en
 * https://www.correoargentino.com.ar/MiCorreo/empresas y las credenciales de API
 * las entrega el ejecutivo de cuenta.
 *
 * IMPORTANTE: igual que Andreani, está escrita contra la especificación
 * documentada pero NO fue probada contra la API real por falta de credenciales.
 * Si falla, el orquestador cae en las tarifas de tabla y el checkout sigue
 * funcionando.
 */

const BASE_URL =
  process.env.CORREO_ARGENTINO_API_URL ?? "https://api.correoargentino.com.ar/micorreo/v1";
const TOKEN_TTL_MS = 20 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

function requiredEnv() {
  return {
    user: process.env.CORREO_ARGENTINO_USER,
    password: process.env.CORREO_ARGENTINO_PASSWORD,
    customerId: process.env.CORREO_ARGENTINO_CUSTOMER_ID,
    originPostalCode: process.env.CORREO_ARGENTINO_ORIGIN_CP ?? "1900",
  };
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const { user, password } = requiredEnv();

  const response = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new ShippingQuoteError(
      "correo-argentino",
      `Login rechazado (HTTP ${response.status}). Revisá las credenciales de Mi Correo.`
    );
  }

  const body = (await response.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) {
    throw new ShippingQuoteError("correo-argentino", "El login no devolvió token.");
  }

  cachedToken = { value: body.token, expiresAt: now + TOKEN_TTL_MS };
  return body.token;
}

interface CorreoRate {
  deliveryType?: string;
  productType?: string;
  price?: number | string;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
}

interface CorreoRatesResponse {
  rates?: CorreoRate[];
}

/** Traduce los códigos de servicio a algo legible para el cliente. */
function describeService(rate: CorreoRate): string {
  const product = rate.productType?.toUpperCase() ?? "";
  const delivery = rate.deliveryType?.toUpperCase() ?? "";

  const speed = product.includes("EXPRESO") ? "Expreso" : "Clásico";
  const mode = delivery === "S" || delivery.includes("SUCURSAL") ? "a sucursal" : "a domicilio";

  return `Correo Argentino ${speed} ${mode}`;
}

export const correoArgentinoProvider: ShippingProvider = {
  id: "correo-argentino",
  name: "Correo Argentino",

  isConfigured() {
    const { user, password, customerId } = requiredEnv();
    return Boolean(user && password && customerId);
  },

  async quote(request: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const { customerId, originPostalCode } = requiredEnv();
    const token = await getToken();

    const response = await fetch(`${BASE_URL}/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customerId,
        postalCodeOrigin: originPostalCode,
        postalCodeDestination: request.postalCode,
        dimensions: {
          // Correo Argentino pide gramos.
          weight: Math.max(100, Math.round(request.weightKg * 1000)),
          height: 15,
          width: 30,
          length: 40,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 401) {
      cachedToken = null;
      throw new ShippingQuoteError("correo-argentino", "Token rechazado (401).");
    }

    if (!response.ok) {
      throw new ShippingQuoteError(
        "correo-argentino",
        `Cotización rechazada (HTTP ${response.status}) para el CP ${request.postalCode}.`
      );
    }

    const payload = (await response.json()) as CorreoRatesResponse;
    const rates = Array.isArray(payload.rates) ? payload.rates : [];

    const options: ShippingQuoteOption[] = [];

    for (const rate of rates) {
      const price = Number(rate.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const min = rate.deliveryTimeMin;
      const max = rate.deliveryTimeMax;
      const estimated =
        min && max ? `${min}-${max} días hábiles` : min ? `${min} días hábiles` : null;

      options.push({
        id: `correo-argentino:${rate.productType ?? "clasico"}:${rate.deliveryType ?? "D"}`,
        providerId: "correo-argentino",
        providerName: "Correo Argentino",
        serviceName: describeService(rate),
        priceArs: Math.round(price),
        estimatedDays: estimated,
      });
    }

    if (options.length === 0) {
      throw new ShippingQuoteError(
        "correo-argentino",
        "La respuesta no incluyó tarifas utilizables."
      );
    }

    return options;
  },
};
