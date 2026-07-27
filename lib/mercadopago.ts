import { createHmac, timingSafeEqual } from "crypto";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { getAppUrl } from "@/lib/utils";

/**
 * Integración con Mercado Pago (Checkout Pro).
 *
 * Mercado Pago Argentina cobra en pesos, así que todos los importes que salen
 * de acá ya vienen convertidos a ARS por el motor de precios.
 */

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

export class MercadoPagoNotConfiguredError extends Error {
  constructor() {
    super("Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno");
    this.name = "MercadoPagoNotConfiguredError";
  }
}

let cachedClient: MercadoPagoConfig | null = null;

/**
 * El cliente se crea perezosamente: si se instanciara al importar el módulo,
 * cualquier página que lo toque rompería el build cuando falta el token.
 */
function getClient(): MercadoPagoConfig {
  if (!isMercadoPagoConfigured()) throw new MercadoPagoNotConfiguredError();
  if (!cachedClient) {
    cachedClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
      options: { timeout: 10000 },
    });
  }
  return cachedClient;
}

interface CreatePreferenceItem {
  id: string;
  title: string;
  quantity: number;
  /** Precio unitario en pesos argentinos. */
  unitPriceArs: number;
  picture_url?: string;
}

interface CreatePreferenceOptions {
  orderId: string;
  orderNumber: string;
  items: CreatePreferenceItem[];
  payer: { name: string; surname: string; email: string; phone?: string };
  shippingCostArs: number;
  discountArs: number;
  surchargeArs: number;
  /** Total final en pesos, calculado por el servidor. */
  totalArs: number;
}

export interface CreatePreferenceResult {
  preferenceId: string;
  initPoint: string;
}

export async function createCheckoutPreference(
  opts: CreatePreferenceOptions
): Promise<CreatePreferenceResult> {
  const client = getClient();
  const BASE = getAppUrl();

  const items = opts.items.map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unitPriceArs,
    currency_id: "ARS",
    picture_url: item.picture_url,
  }));

  // El recargo del medio de pago se manda como un ítem propio para que el
  // cliente vea el desglose y el total de MP coincida con el del pedido.
  if (opts.surchargeArs > 0) {
    items.push({
      id: "surcharge",
      title: "Recargo por medio de pago",
      quantity: 1,
      unit_price: opts.surchargeArs,
      currency_id: "ARS",
      picture_url: undefined,
    });
  }

  const body = {
    items,
    payer: {
      name: opts.payer.name,
      surname: opts.payer.surname,
      email: opts.payer.email,
      phone: opts.payer.phone ? { number: opts.payer.phone } : undefined,
    },
    shipments: {
      cost: opts.shippingCostArs,
      mode: "not_specified" as const,
    },
    back_urls: {
      success: `${BASE}/checkout/success?order_id=${opts.orderId}`,
      failure: `${BASE}/checkout/failure?order_id=${opts.orderId}`,
      pending: `${BASE}/checkout/pending?order_id=${opts.orderId}`,
    },
    auto_return: "approved" as const,
    // Ancla el pago al pedido: es lo que lee el webhook para saber qué actualizar.
    external_reference: opts.orderId,
    notification_url: `${BASE}/api/webhook/mercadopago`,
    statement_descriptor: "ELECTRONIC LP",
    metadata: { order_id: opts.orderId, order_number: opts.orderNumber },
  };

  const result = await new Preference(client).create({ body });

  if (!result.id || !result.init_point) {
    throw new Error("Mercado Pago no devolvió un punto de inicio válido");
  }

  return { preferenceId: result.id, initPoint: result.init_point };
}

export async function getPaymentById(paymentId: string) {
  return new Payment(getClient()).get({ id: paymentId });
}

// ─── Verificación de webhooks ─────────────────────────────────

/**
 * Valida la firma `x-signature` que envía Mercado Pago.
 *
 * El manifiesto que se firma es exactamente:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * con HMAC-SHA256 y la clave secreta del webhook (panel de MP → Webhooks).
 *
 * Sin esta validación el endpoint es público y cualquiera puede marcar
 * pedidos como pagados haciendo un POST.
 */
export function verifyWebhookSignature(options: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): { valid: boolean; reason?: string } {
  if (!options.signatureHeader) return { valid: false, reason: "Falta el header x-signature" };
  if (!options.dataId) return { valid: false, reason: "Falta data.id" };

  // Formato: "ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839"
  const parts = options.signatureHeader.split(",");
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=", 2);
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim();
    if (key === "ts") ts = rawValue.trim();
    if (key === "v1") v1 = rawValue.trim();
  }

  if (!ts || !v1) return { valid: false, reason: "Header x-signature mal formado" };

  // Rechaza reenvíos viejos (ventana de 15 minutos).
  const timestampMs = Number(ts);
  if (Number.isFinite(timestampMs)) {
    const ageMs = Math.abs(Date.now() - timestampMs);
    if (ageMs > 15 * 60 * 1000) return { valid: false, reason: "Firma expirada" };
  }

  // MP documenta el id en minúsculas dentro del manifiesto.
  const manifest = `id:${options.dataId.toLowerCase()};request-id:${options.requestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", options.secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(v1, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return { valid: false, reason: "Firma inválida" };
  }

  // Comparación en tiempo constante: evita ataques de temporización.
  return timingSafeEqual(expectedBuffer, receivedBuffer)
    ? { valid: true }
    : { valid: false, reason: "Firma inválida" };
}
