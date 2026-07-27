import { db } from "@/lib/db";
import { getExchangeRate } from "@/lib/currency";
import { getPricingConfig } from "@/lib/pricing";
import { PaymentSettingsForm } from "@/components/admin/payment-settings-form";

export const metadata = { title: "Pagos y monedas | Admin" };

export default async function PaymentSettingsPage() {
  const [rate, pricing, rows] = await Promise.all([
    getExchangeRate(),
    getPricingConfig(),
    db.siteSetting.findMany({
      where: {
        key: {
          in: [
            "usd_rate_mode",
            "usd_blue_fallback",
            "usd_blue_ttl_minutes",
            "payment_instructions_transfer",
            "payment_instructions_cash",
            "payment_instructions_usdt",
          ],
        },
      },
    }),
  ]);

  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pagos y monedas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cotización del dólar, recargos por medio de pago y datos que recibe el cliente para
          abonar.
        </p>
      </header>

      <PaymentSettingsForm
        initial={{
          baseCurrency: pricing.baseCurrency,
          rateMode: map.usd_rate_mode ?? "auto",
          manualRate: map.usd_blue_fallback ?? "",
          ttlMinutes: map.usd_blue_ttl_minutes ?? "60",
          surcharges: pricing.surcharges,
          instructions: {
            transfer: map.payment_instructions_transfer ?? "",
            cash: map.payment_instructions_cash ?? "",
            usdt: map.payment_instructions_usdt ?? "",
          },
        }}
        currentRate={rate.rate}
        rateSource={rate.source}
        rateUpdatedAt={rate.updatedAt.toISOString()}
      />
    </div>
  );
}
