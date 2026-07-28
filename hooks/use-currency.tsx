"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Moneda de visualización.
 *
 * Los precios se guardan y se calculan en la moneda base de la tienda (USD).
 * Este contexto solo cambia en qué moneda los *ve* el visitante; el importe que
 * se cobra lo decide siempre el servidor en el checkout.
 *
 * Precio en pesos: si el producto tiene `priceArs` cargado por el
 * administrador, ese valor manda; si no, se convierte con la cotización.
 *
 * El precio mostrado NO incluye recargos por medio de pago. Antes se le sumaba
 * el recargo del efectivo en pesos (10%), con lo que el catálogo mostraba un
 * número más alto que el que después aparecía en el checkout para Mercado Pago
 * o transferencia: la lista de precios y el checkout no coincidían nunca. Ahora
 * el precio de lista es uno solo y el recargo aparece explícito, como una línea
 * aparte, al elegir el medio de pago.
 *
 * La cotización llega desde un Server Component (no se consulta la API desde el
 * navegador) y la preferencia se guarda en localStorage.
 */

export type DisplayCurrency = "USD" | "ARS";

const STORAGE_KEY = "elp-display-currency";

interface CurrencyContextValue {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  toggle: () => void;
  /** Moneda en la que están expresados los precios de catálogo. */
  baseCurrency: DisplayCurrency;
  /** Pesos por dólar. */
  rate: number;
  /**
   * Recargo del efectivo en pesos. Ya NO se suma al precio mostrado; se expone
   * solo para poder explicarlo en pantalla.
   */
  arsSurchargePercent: number;
  /**
   * Convierte un precio base a la moneda elegida y lo formatea.
   * `arsOverride` es el precio en pesos fijado por el administrador: cuando
   * existe, se muestra tal cual en lugar de la conversión.
   */
  format: (baseAmount: number, arsOverride?: number | null) => string;
  /** Convierte sin formatear, por si hace falta el número. */
  convert: (baseAmount: number, arsOverride?: number | null) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

interface CurrencyProviderProps {
  children: React.ReactNode;
  rate: number;
  baseCurrency: DisplayCurrency;
  arsSurchargePercent: number;
}

export function CurrencyProvider({
  children,
  rate,
  baseCurrency,
  arsSurchargePercent,
}: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(baseCurrency);

  // Se lee la preferencia después del montaje para no romper la hidratación:
  // el servidor no conoce el localStorage del visitante.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "USD" || stored === "ARS") setCurrencyState(stored);
    } catch {
      // Modo privado o almacenamiento bloqueado: se sigue con la moneda base.
    }
  }, []);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setCurrencyState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin persistencia, el cambio igual aplica para esta sesión.
    }
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    function convert(baseAmount: number, arsOverride?: number | null): number {
      // El precio en pesos cargado a mano manda sobre cualquier conversión.
      // Si la moneda base ya es ARS, `baseAmount` es el precio en pesos y el
      // override no corresponde.
      if (
        currency === "ARS" &&
        baseCurrency !== "ARS" &&
        arsOverride != null &&
        arsOverride > 0
      ) {
        return Math.round(arsOverride);
      }

      if (currency === baseCurrency) return baseAmount;
      if (currency === "ARS") return Math.round(baseAmount * rate);
      return Math.round((baseAmount / rate) * 100) / 100;
    }

    function format(baseAmount: number, arsOverride?: number | null): string {
      const amount = convert(baseAmount, arsOverride);
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "ARS" ? 0 : 2,
        maximumFractionDigits: currency === "ARS" ? 0 : 2,
      }).format(amount);
    }

    return {
      currency,
      setCurrency,
      toggle: () => setCurrency(currency === "USD" ? "ARS" : "USD"),
      baseCurrency,
      rate,
      arsSurchargePercent,
      convert,
      format,
    };
  }, [currency, setCurrency, baseCurrency, rate, arsSurchargePercent]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/**
 * Devuelve el contexto de moneda. Si un componente se usa fuera del provider,
 * cae en dólares sin conversión en lugar de lanzar: es solo presentación y no
 * vale la pena tumbar la página por eso.
 */
export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);

  if (context) return context;

  return {
    currency: "USD",
    setCurrency: () => {},
    toggle: () => {},
    baseCurrency: "USD",
    rate: 1,
    arsSurchargePercent: 0,
    convert: (amount: number) => amount,
    format: (amount: number) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(amount),
  };
}
