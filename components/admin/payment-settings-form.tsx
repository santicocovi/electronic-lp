"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, RefreshCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { savePaymentSettings, refreshDollarRate } from "@/actions/admin/settings";
import { PAYMENT_OPTIONS, PAYMENT_OPTION_KEYS } from "@/lib/pricing";

/** Configuración de moneda, recargos e instrucciones de pago. */

interface PaymentSettingsFormProps {
  initial: {
    baseCurrency: string;
    rateMode: string;
    manualRate: string;
    ttlMinutes: string;
    surcharges: Record<string, number>;
    instructions: {
      transfer: string;
      cash: string;
      usdt: string;
    };
  };
  currentRate: number;
  rateSource: string;
  rateUpdatedAt: string;
}

export function PaymentSettingsForm({
  initial,
  currentRate,
  rateSource,
  rateUpdatedAt,
}: PaymentSettingsFormProps) {
  const router = useRouter();

  const [baseCurrency, setBaseCurrency] = useState(initial.baseCurrency);
  const [rateMode, setRateMode] = useState(initial.rateMode);
  const [manualRate, setManualRate] = useState(initial.manualRate);
  const [ttlMinutes, setTtlMinutes] = useState(initial.ttlMinutes);
  const [surcharges, setSurcharges] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial.surcharges).map(([k, v]) => [k, String(v)]))
  );
  const [instructions, setInstructions] = useState(initial.instructions);

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleSave() {
    setSaving(true);

    const payload: Record<string, string> = {
      base_currency: baseCurrency,
      usd_rate_mode: rateMode,
      usd_blue_fallback: manualRate,
      usd_blue_ttl_minutes: ttlMinutes,
      payment_instructions_transfer: instructions.transfer,
      payment_instructions_cash: instructions.cash,
      payment_instructions_usdt: instructions.usdt,
    };

    for (const key of PAYMENT_OPTION_KEYS) {
      payload[PAYMENT_OPTIONS[key].surchargeSettingKey] = surcharges[key] ?? "0";
    }

    const result = await savePaymentSettings(payload);

    toast.add(
      result.success
        ? { title: "Guardado", description: result.message }
        : { title: result.error, type: "error" }
    );

    if (result.success) router.refresh();
    setSaving(false);
  }

  async function handleRefreshRate() {
    setRefreshing(true);
    const result = await refreshDollarRate();
    toast.add(
      result.success
        ? { title: "Cotización actualizada", description: result.message }
        : { title: result.error, type: "error" }
    );
    if (result.success) router.refresh();
    setRefreshing(false);
  }

  const sourceLabel: Record<string, string> = {
    api: "obtenida de dolarapi.com",
    cache: "desde caché",
    "stale-cache": "caché vencida (la API no respondió)",
    manual: "fijada manualmente",
    fallback: "valor de respaldo",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Cotización */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Cotización del dólar</h2>
          <p className="text-sm text-gray-500 mt-1">
            Se usa para convertir los precios a pesos y calcular los totales del checkout.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
          <div>
            <p className="text-2xl font-semibold text-gray-900">
              ${currentRate.toLocaleString("es-AR")}
              <span className="ml-1.5 text-sm font-normal text-gray-400">por USD</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {sourceLabel[rateSource] ?? rateSource} ·{" "}
              {new Date(rateUpdatedAt).toLocaleString("es-AR")}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-xl gap-2"
            disabled={refreshing}
            onClick={handleRefreshRate}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCcw className="w-4 h-4" aria-hidden="true" />
            )}
            Actualizar ahora
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="rate-mode">Modo</Label>
            <select
              id="rate-mode"
              value={rateMode}
              onChange={(e) => setRateMode(e.target.value)}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 text-sm px-3 bg-white"
            >
              <option value="auto">Automático (dólar blue)</option>
              <option value="manual">Manual (valor fijo)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="manual-rate">
              {rateMode === "manual" ? "Cotización fija" : "Valor de respaldo"}
            </Label>
            <Input
              id="manual-rate"
              type="number"
              min="0"
              step="1"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              className="mt-1 rounded-xl"
              placeholder="1500"
            />
          </div>

          <div>
            <Label htmlFor="ttl">Actualizar cada (minutos)</Label>
            <Input
              id="ttl"
              type="number"
              min="5"
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
        </div>

        <p className="flex gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          Fuente automática: dolarapi.com (gratuita, sin credenciales). Si la API no responde se
          usa la última cotización conocida y, si no hay ninguna, el valor de respaldo.
        </p>
      </section>

      {/* Moneda base */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Moneda de los precios</h2>
          <p className="text-sm text-gray-500 mt-1">
            En qué moneda están cargados los precios de los productos.
          </p>
        </div>

        <div className="max-w-xs">
          <Label htmlFor="base-currency">Moneda base</Label>
          <select
            id="base-currency"
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="mt-1 w-full h-10 rounded-xl border border-gray-200 text-sm px-3 bg-white"
          >
            <option value="USD">Dólares estadounidenses (USD)</option>
            <option value="ARS">Pesos argentinos (ARS)</option>
          </select>
        </div>

        <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          Cambiar esto reinterpreta todos los precios ya cargados: un producto en 1200 pasa de
          significar US$ 1.200 a $ 1.200. Modificalo solo si vas a recargar los precios.
        </p>
      </section>

      {/* Recargos */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Recargos por medio de pago</h2>
          <p className="text-sm text-gray-500 mt-1">
            Porcentaje que se suma al total según cómo pague el cliente. Se aplica en el checkout y
            se muestra en la ficha de producto.
          </p>
        </div>

        <div className="space-y-3">
          {PAYMENT_OPTION_KEYS.map((key) => (
            <div
              key={key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <Label htmlFor={`surcharge-${key}`} className="text-sm">
                  {PAYMENT_OPTIONS[key].label}
                </Label>
                <p className="text-xs text-gray-400">
                  Se cobra en {PAYMENT_OPTIONS[key].currency}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id={`surcharge-${key}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={surcharges[key] ?? "0"}
                  onChange={(e) =>
                    setSurcharges((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-24 rounded-xl text-right"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Instrucciones */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Instrucciones de pago</h2>
          <p className="text-sm text-gray-500 mt-1">
            Se envían por email al cliente cuando elige un medio coordinado. Completá estos datos:
            sin ellos el cliente recibe un mensaje genérico.
          </p>
        </div>

        <div>
          <Label htmlFor="instr-transfer">Transferencia bancaria</Label>
          <Textarea
            id="instr-transfer"
            rows={4}
            value={instructions.transfer}
            onChange={(e) => setInstructions((p) => ({ ...p, transfer: e.target.value }))}
            className="mt-1 rounded-xl"
            placeholder={"Banco: ...\nCBU: ...\nAlias: ...\nTitular: ...\nCUIT: ..."}
          />
        </div>

        <div>
          <Label htmlFor="instr-usdt">USDT</Label>
          <Textarea
            id="instr-usdt"
            rows={3}
            value={instructions.usdt}
            onChange={(e) => setInstructions((p) => ({ ...p, usdt: e.target.value }))}
            className="mt-1 rounded-xl"
            placeholder={"Red: TRC20\nDirección: ...\nEnviá el comprobante por WhatsApp."}
          />
        </div>

        <div>
          <Label htmlFor="instr-cash">Efectivo (dólares o pesos)</Label>
          <Textarea
            id="instr-cash"
            rows={3}
            value={instructions.cash}
            onChange={(e) => setInstructions((p) => ({ ...p, cash: e.target.value }))}
            className="mt-1 rounded-xl"
            placeholder="Coordinamos punto de entrega en La Plata. Dólares: únicamente billetes de cara grande, sin roturas ni manchas."
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl gap-2 bg-brand-blue-mid hover:bg-brand-blue-hover"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="w-4 h-4" aria-hidden="true" />
          )}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
