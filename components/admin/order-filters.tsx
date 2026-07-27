"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/order-status";

/**
 * Barra de filtros del listado de pedidos.
 * El estado vive en la URL, así los filtros se pueden compartir y sobreviven
 * a un refresh o a volver desde el detalle de un pedido.
 */

const PAYMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "IN_PROCESS", "REFUNDED"];
const PAYMENT_METHODS = ["MERCADOPAGO", "TRANSFER", "CASH", "USDT"];

export function OrderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(searchParams.get("payment") || searchParams.get("method") || searchParams.get("from"))
  );

  const currentStatus = searchParams.get("status") ?? "";
  const currentPayment = searchParams.get("payment") ?? "";
  const currentMethod = searchParams.get("method") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }

      // Cualquier cambio de filtro vuelve a la primera página.
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  // Búsqueda con retardo: no se dispara una consulta por cada tecla.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (query === current) return;

    const timer = setTimeout(() => pushParams({ q: query || null }), 400);
    return () => clearTimeout(timer);
  }, [query, searchParams, pushParams]);

  const hasFilters = Boolean(
    currentStatus || currentPayment || currentMethod || from || to || searchParams.get("q")
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número de pedido, cliente, email o seguimiento"
            className="pl-9 pr-9 rounded-xl"
            aria-label="Buscar pedidos"
          />
          {pending ? (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin"
              aria-hidden="true"
            />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2 shrink-0"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          Más filtros
        </Button>

        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl shrink-0 text-gray-500"
            onClick={() => startTransition(() => router.push(pathname))}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Estados */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Todos"
          active={!currentStatus}
          onClick={() => pushParams({ status: null })}
        />
        {ORDER_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={ORDER_STATUS_LABELS[s]}
            active={currentStatus === s}
            onClick={() => pushParams({ status: currentStatus === s ? null : s })}
          />
        ))}
      </div>

      {/* Filtros avanzados */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Estado del pago</span>
            <select
              value={currentPayment}
              onChange={(e) => pushParams({ payment: e.target.value || null })}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 text-sm px-3 bg-white"
            >
              <option value="">Todos</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Medio de pago</span>
            <select
              value={currentMethod}
              onChange={(e) => pushParams({ method: e.target.value || null })}
              className="mt-1 w-full h-10 rounded-xl border border-gray-200 text-sm px-3 bg-white"
            >
              <option value="">Todos</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Desde</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => pushParams({ from: e.target.value || null })}
              className="mt-1 rounded-xl"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-500">Hasta</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => pushParams({ to: e.target.value || null })}
              className="mt-1 rounded-xl"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-brand-blue-subtle text-brand-blue-mid"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
