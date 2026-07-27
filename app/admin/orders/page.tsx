import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { formatStoreDate } from "@/lib/dates";
import { ShoppingBag, Eye } from "lucide-react";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
} from "@/lib/order-status";

export const metadata = { title: "Pedidos | Admin" };

const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const status = params.status;

  const where = status && ORDER_STATUSES.includes(status as never)
    ? { status: status as never }
    : {};

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, orderNumber: true, status: true, paymentStatus: true,
        total: true, createdAt: true, shippingName: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function filterHref(s: string) {
    return s ? `/admin/orders?status=${s}` : "/admin/orders";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">{total} pedidos{status ? " con este estado" : " en total"}</p>
      </div>

      {/* Status filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-2">
        <Link
          href={filterHref("")}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!status ? "bg-brand-blue-subtle text-brand-blue-mid" : "text-gray-500 hover:bg-gray-50"}`}
        >
          Todos
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${status === s ? "bg-brand-blue-subtle text-brand-blue-mid" : "text-gray-500 hover:bg-gray-50"}`}
          >
            {ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedido</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Pago</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-gray-900">#{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">{o._count.items} producto(s)</p>
                </td>
                <td className="px-4 py-4 hidden md:table-cell">
                  <p className="text-sm text-gray-700">{o.shippingName ?? o.user?.name ?? "–"}</p>
                  <p className="text-xs text-gray-400">{o.user?.email}</p>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                  {formatStoreDate(o.createdAt)}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </td>
                <td className="px-4 py-4 hidden sm:table-cell">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${PAYMENT_STATUS_COLORS[o.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatPrice(Number(o.total))}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <Link href={`/admin/orders/${o.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Ver pedido">
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No se encontraron pedidos</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/orders?page=${p}${status ? `&status=${status}` : ""}`}
              className={`w-9 h-9 rounded-xl text-sm font-medium flex items-center justify-center transition-colors ${p === page ? "bg-brand-blue-mid text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
