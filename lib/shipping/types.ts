/**
 * Contrato de los proveedores de cotización de envío.
 *
 * Toda tarifa se expresa SIEMPRE en pesos argentinos: los transportistas
 * (Andreani, Correo Argentino) facturan en ARS y el envío nunca se convierte a
 * dólares ni se mezcla con el subtotal en moneda base.
 *
 * Para agregar un transportista nuevo alcanza con implementar `ShippingProvider`
 * y registrarlo en `lib/shipping/index.ts`. Nada más del sistema cambia.
 */

export interface ShippingQuoteRequest {
  /** Código postal de destino, solo dígitos (ej: "1900"). */
  postalCode: string;
  /** Peso total del pedido en kilos. */
  weightKg: number;
  /** Volumen total en cm³, si se conoce. */
  volumeCm3?: number;
  /** Valor declarado en ARS, para el seguro del transportista. */
  declaredValueArs: number;
  /** Cantidad de bultos. */
  packages: number;
}

export interface ShippingQuoteOption {
  /** Identificador estable, usado como valor del radio en el checkout. */
  id: string;
  providerId: string;
  providerName: string;
  /** Nombre visible del servicio (ej: "Andreani Estándar a domicilio"). */
  serviceName: string;
  /** Tarifa en PESOS ARGENTINOS. Nunca en dólares. */
  priceArs: number;
  estimatedDays: string | null;
  /** true si es entrega en mano / retiro, sin transportista. */
  isLocal?: boolean;
  /** true si salió de la tabla de respaldo y no de una API en vivo. */
  isFallback?: boolean;
  description?: string | null;
}

export interface ShippingProvider {
  id: string;
  name: string;
  /** false si faltan credenciales: el orquestador lo saltea sin fallar. */
  isConfigured(): boolean;
  /** Devuelve las opciones disponibles. Debe lanzar si la API falla. */
  quote(request: ShippingQuoteRequest): Promise<ShippingQuoteOption[]>;
}

/** Error de cotización con contexto, para poder loguear qué proveedor falló. */
export class ShippingQuoteError extends Error {
  constructor(
    readonly providerId: string,
    message: string,
    readonly cause?: unknown
  ) {
    super(`[${providerId}] ${message}`);
    this.name = "ShippingQuoteError";
  }
}
