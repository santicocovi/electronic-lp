import { Banknote, Coins, Landmark, CreditCard, Wallet, IdCard, Info } from "lucide-react";
import { getPricingConfig, PAYMENT_OPTIONS } from "@/lib/pricing";
import { getExchangeRate } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * Condiciones comerciales de pago.
 *
 * Los porcentajes se leen de la misma configuración que usa el motor de precios,
 * así lo que se muestra acá nunca se despega de lo que se cobra en el checkout.
 */

interface PaymentTermsProps {
  className?: string;
  /** `compact` para la ficha de producto; `full` para checkout y carrito. */
  variant?: "full" | "compact";
}

export async function PaymentTerms({ className, variant = "full" }: PaymentTermsProps) {
  const [config, rate] = await Promise.all([getPricingConfig(), getExchangeRate()]);
  const s = config.surcharges;

  const terms = [
    {
      icon: Banknote,
      title: "Dólares estadounidenses",
      detail:
        "Únicamente billetes de cara grande, sin roturas ni manchas. Sin excepciones.",
      badge: s.CASH_USD > 0 ? `+${s.CASH_USD}%` : "Sin recargo",
      highlight: true,
    },
    {
      icon: Coins,
      title: "Pesos argentinos",
      detail: `Se toma la cotización de venta del dólar blue del día${
        s.CASH_ARS > 0 ? ` con un ${s.CASH_ARS}% adicional` : ""
      }.`,
      badge: s.CASH_ARS > 0 ? `+${s.CASH_ARS}%` : "Sin recargo",
    },
    {
      icon: Landmark,
      title: "Transferencia bancaria",
      detail: "Transferencia en pesos a nuestra cuenta.",
      badge: s.TRANSFER > 0 ? `+${s.TRANSFER}%` : "Sin recargo",
    },
    {
      icon: CreditCard,
      title: "Mercado Pago",
      detail: "Tarjeta de crédito o débito, con financiación en cuotas.",
      badge: s.MERCADOPAGO > 0 ? `+${s.MERCADOPAGO}%` : "Sin recargo",
    },
    {
      icon: IdCard,
      title: "Crédito con DNI",
      detail: "Sujeto a aprobación, gestionado a través de Mercado Pago.",
      badge: "Según cuotas",
    },
    {
      icon: Wallet,
      title: "USDT",
      detail: "Transferencia en criptomoneda estable.",
      badge: s.USDT > 0 ? `+${s.USDT}%` : "0% de recargo",
    },
  ];

  if (variant === "compact") {
    return (
      <div className={cn("rounded-2xl border border-gray-100 bg-gray-50/60 p-5", className)}>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Medios de pago</h3>
        <ul className="space-y-2">
          {terms.map((t) => (
            <li key={t.title} className="flex items-start gap-2.5 text-sm">
              <t.icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-gray-600 flex-1">{t.title}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{t.badge}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section
      className={cn("rounded-3xl border border-gray-100 bg-white p-6 sm:p-8", className)}
      aria-labelledby="payment-terms-heading"
    >
      <h2 id="payment-terms-heading" className="text-lg font-semibold tracking-tight text-gray-900">
        Aceptamos
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        Cotización de referencia: 1 USD = ${rate.rate.toLocaleString("es-AR")} ARS
        <span className="text-gray-400">
          {" · "}actualizada el {rate.updatedAt.toLocaleDateString("es-AR")}
        </span>
      </p>

      <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        {terms.map((t) => (
          <li key={t.title} className="flex gap-3">
            <span
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                t.highlight ? "bg-emerald-50 text-emerald-600" : "bg-gray-50 text-gray-500"
              )}
            >
              <t.icon className="w-4.5 h-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 text-sm">{t.title}</p>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    t.badge.startsWith("+")
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  )}
                >
                  {t.badge}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{t.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 flex gap-2 text-xs text-gray-400 leading-relaxed">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
        Los recargos se calculan automáticamente sobre el total del pedido al elegir el medio de
        pago en el checkout. La cotización se congela al confirmar la compra.
      </p>
    </section>
  );
}

/** Regla de dólares billete, para destacar donde haga falta. */
export const USD_CASH_RULE =
  "Dólares en efectivo: únicamente billetes de cara grande, sin roturas ni manchas. Sin excepciones.";
