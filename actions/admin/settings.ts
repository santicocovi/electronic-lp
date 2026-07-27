"use server";

import { requireAdmin, toActionError } from "@/lib/auth-guard";
import { updateManySettings } from "@/lib/settings";
import { refreshExchangeRate, invalidateExchangeRateCache } from "@/lib/currency";
import { PAYMENT_OPTIONS, PAYMENT_OPTION_KEYS } from "@/lib/pricing";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export async function saveSettings(settings: Record<string, string>, group = "general"): Promise<ActionResult> {
  try {
    await requireAdmin();
    await updateManySettings(settings, group);
    revalidatePath("/");
    revalidatePath("/admin/settings/general");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar la configuración" };
  }
}

/**
 * Guarda la configuración de pagos: moneda base, recargos por medio de pago,
 * modo de cotización e instrucciones que se le envían al cliente.
 */
export async function savePaymentSettings(
  settings: Record<string, string>
): Promise<ActionResult> {
  try {
    await requireAdmin();

    // Los recargos se validan acá: un valor basura haría que el checkout
    // cobrara distinto de lo que muestra la ficha de producto.
    for (const key of PAYMENT_OPTION_KEYS) {
      const settingKey = PAYMENT_OPTIONS[key].surchargeSettingKey;
      if (!(settingKey in settings)) continue;

      const value = Number(settings[settingKey]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return {
          success: false,
          error: `El recargo de "${PAYMENT_OPTIONS[key].shortLabel}" debe ser un número entre 0 y 100`,
        };
      }
      settings[settingKey] = String(value);
    }

    if ("usd_blue_fallback" in settings) {
      const value = Number(settings.usd_blue_fallback);
      if (settings.usd_blue_fallback !== "" && (!Number.isFinite(value) || value <= 0)) {
        return { success: false, error: "La cotización manual debe ser un número mayor a 0" };
      }
    }

    if ("usd_blue_ttl_minutes" in settings) {
      const value = Number(settings.usd_blue_ttl_minutes);
      if (!Number.isFinite(value) || value < 5) {
        return { success: false, error: "La frecuencia de actualización debe ser de al menos 5 minutos" };
      }
    }

    await updateManySettings(settings, "currency");

    // La caché en memoria del motor de precios queda obsoleta tras el cambio.
    invalidateExchangeRateCache();

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/payments");
    revalidatePath("/checkout");

    return { success: true, message: "Configuración de pagos guardada." };
  } catch (error) {
    return toActionError(error, "Error al guardar la configuración de pagos");
  }
}

/** Fuerza una consulta a la API del dólar y devuelve la cotización nueva. */
export async function refreshDollarRate(): Promise<
  ActionResult<{ rate: number; source: string; updatedAt: string }>
> {
  try {
    await requireAdmin();

    const result = await refreshExchangeRate();

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/payments");

    return {
      success: true,
      data: {
        rate: result.rate,
        source: result.source,
        updatedAt: result.updatedAt.toISOString(),
      },
      message:
        result.source === "api"
          ? `Cotización actualizada: $${result.rate.toLocaleString("es-AR")} por USD.`
          : `No se pudo consultar la API. Se está usando el valor de respaldo ($${result.rate.toLocaleString("es-AR")}).`,
    };
  } catch (error) {
    return toActionError(error, "Error al actualizar la cotización");
  }
}
