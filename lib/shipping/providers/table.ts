import { db } from "@/lib/db";
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from "@/lib/shipping/types";

/**
 * Proveedor de respaldo: tarifas planas de la tabla `ShippingMethod`.
 *
 * Siempre está disponible y no depende de ninguna API externa, así que garantiza
 * que el checkout pueda cotizar aunque Andreani o Correo Argentino estén caídos
 * o todavía sin credenciales.
 *
 * Los precios de `ShippingMethod.price` están en PESOS ARGENTINOS (los valores
 * cargados son 4500, 6500, 0 — inequívocamente ARS).
 */
export const tableProvider: ShippingProvider = {
  id: "table",
  name: "Tarifa de tabla",

  isConfigured() {
    return true;
  },

  async quote(_request: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const methods = await db.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    return methods.map((method) => ({
      id: `table:${method.id}`,
      providerId: "table",
      providerName: method.name,
      serviceName: method.name,
      priceArs: Math.round(Number(method.price)),
      estimatedDays: method.estimatedDays,
      description: method.description,
      // Los métodos con precio 0 son retiro o entrega propia.
      isLocal: Number(method.price) === 0,
      isFallback: true,
    }));
  },
};
