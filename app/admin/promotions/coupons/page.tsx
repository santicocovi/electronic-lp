import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, getPricingConfig } from "@/lib/pricing";
import { formatStoreDate } from "@/lib/dates";
import { Plus, Pencil, Percent, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { deleteCoupon } from "@/actions/admin/coupons";

export const metadata = { title: "Cupones | Admin" };

export default async function AdminCouponsPage() {
  const [coupons, pricing] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    getPricingConfig(),
  ]);
  const now = new Date();

  // Los cupones de importe fijo están expresados en la moneda base del catálogo.
  const fmt = (value: number) => formatMoney(value, pricing.baseCurrency);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupones</h1>
          <p className="text-sm text-gray-500 mt-1">{coupons.length} cupones en total</p>
        </div>
        <Link href="/admin/promotions/coupons/new">
          <Button className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
            <Plus className="w-4 h-4" /> Nuevo cupón
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descuento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Usos</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Vigencia</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {coupons.map((c) => {
              const expired = c.expiresAt ? c.expiresAt < now : false;
              const notStarted = c.startsAt ? c.startsAt > now : false;
              const exhausted = c.usageLimit ? c.usageCount >= c.usageLimit : false;

              return (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900 font-mono">{c.code}</p>
                    {c.description && (
                      <p className="text-xs text-gray-400 max-w-[220px] truncate">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                    {c.type === "PERCENTAGE" ? `${Number(c.value)}%` : fmt(Number(c.value))}
                    {c.minOrderAmount && (
                      <p className="text-xs text-gray-400 font-normal">
                        desde {fmt(Number(c.minOrderAmount))}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 hidden md:table-cell">
                    {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                    {c.startsAt || c.expiresAt ? (
                      <span className="inline-flex items-center gap-1.5">
                        {formatStoreDate(c.startsAt)}
                        <ArrowRight className="w-3 h-3 text-gray-300" aria-hidden="true" />
                        {formatStoreDate(c.expiresAt)}
                      </span>
                    ) : "Sin límite"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {!c.isActive && <Badge variant="outline" className="text-[10px]">Inactivo</Badge>}
                      {c.isActive && expired && <Badge className="bg-red-100 text-red-700 text-[10px]">Vencido</Badge>}
                      {c.isActive && notStarted && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Programado</Badge>}
                      {c.isActive && exhausted && <Badge className="bg-gray-100 text-gray-600 text-[10px]">Agotado</Badge>}
                      {c.isActive && !expired && !notStarted && !exhausted && (
                        <Badge className="bg-green-100 text-green-700 text-[10px]">Activo</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/admin/promotions/coupons/${c.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                      </Link>
                      <AdminDeleteButton
                        id={c.id}
                        name={c.code}
                        action={deleteCoupon}
                        successMessage="Cupón eliminado"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {coupons.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Percent className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>Todavía no hay cupones</p>
          </div>
        )}
      </div>
    </div>
  );
}
