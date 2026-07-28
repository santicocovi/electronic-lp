"use client";

import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";

/**
 * Selector de moneda de visualización (USD / ARS).
 * Es un grupo de dos botones en lugar de un <select> para que el estado actual
 * se vea de un vistazo y sea un solo toque en móvil.
 */

interface CurrencySwitchProps {
  className?: string;
  /** `bare` para usarlo sobre fondos oscuros, como la barra de navegación. */
  variant?: "default" | "bare";
}

export function CurrencySwitch({ className, variant = "default" }: CurrencySwitchProps) {
  const { currency, setCurrency, rate } = useCurrency();

  const options: { value: "USD" | "ARS"; label: string }[] = [
    { value: "USD", label: "USD" },
    { value: "ARS", label: "ARS" },
  ];

  return (
    <div
      role="group"
      aria-label="Moneda de los precios"
      title={`1 USD = $${rate.toLocaleString("es-AR")} ARS. Los recargos por medio de pago se muestran en el checkout.`}
      className={cn(
        "inline-flex items-center rounded-full p-0.5",
        variant === "bare" ? "bg-white/10" : "bg-gray-100",
        className
      )}
    >
      {options.map((option) => {
        const active = currency === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setCurrency(option.value)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors",
              active
                ? variant === "bare"
                  ? "bg-white text-gray-900"
                  : "bg-white text-gray-900 shadow-sm"
                : variant === "bare"
                  ? "text-white/70 hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
