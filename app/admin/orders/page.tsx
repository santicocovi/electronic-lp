import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { formatStoreDate } from "@/lib/dates";
import { ShoppingBag, Eye, Truck, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/order-status";
import { OrderFilters } from "@/components/admin/order-filters";

export const metadata = { title: "Pedidos | Admin" };

const PAGE_SIZE = 20;

interface SearchParams {
  page?: string;
  status?: string;
  payment?: string;
  method?: string;
  q?: string;
  from?: string;
  to?: string;
}

/** Construye el filtro de Prisma a partir de los parámetros de la URL. */
function buildWhere(params: SearchParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (params.status && (ORDER_STATUSES as readonly string[]).includes(params.status)) {
    where.status = params.status as never;
  }

  if (params.payment) where.paymentStatus = params.payment as never;
  if (params.method) where.paymentMethod = params.method as never;

  // Búsqueda libre sobre número de pedido, datos del cliente y seguimiento.
  const query = params.q?.trim();
  if (query) {
    where.OR = [
      { orderNumber: { contains: query, mode: "insensitive" } },
      { shippingName: { contains: query, mode: "insensitive" } },
      { trackingNumber: { contains: query, mode: "insensitive" } },
      { shippingPhone: { contains: query, mode: "insensitive" } },
      { user: { email: { contains: query, mode: "insensitive" } } },
      { user: { name: { contains: query, mode: "insensitive" } } },
    ];
  }

  // Rango de fechas inclusivo en ambos extremos.
  const createdAt: Prisma.DateTimeFilter = {};
  if (params.from) {
    const from = new Date(`${params.from}T00:00:00`);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (params.to) {
    const to = new Date(`${params.to}T23:59:59.999`);
    if (!Number.isNaN(to.getTime())) createdAt.lte = to;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  return where;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const where = buildWhere(params);

  // El total se resuelve primero para poder acotar la página pedida: así un
  // ?page=9999 manipulado a mano no dispara una consulta con offset inexistente.
  const [total, revenue] = await Promise.all([
    db.order.count({ where }),
    // Facturación de los pedidos efectivamente pagados dentro del filtro.
    db.order.aggregate({
      where: { ...where, paymentStatus: "APPROVED" },
      _sum: { total: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page ?? 1) || 1), totalPages);

  const pageOrders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      total: true,
      currency: true,
      createdAt: true,
      shippingName: true,
      trackingNumber: true,
      shippingCarrier: true,
      user: { select: { name: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  function pageHref(target: number) {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") sp.set(key, String(value));
    }
    if (target > 1) sp.set("page", String(target));
    const qs = sp.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "pedido" : "pedidos"} con los filtros actuales
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cobrado</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatMoney(Number(revenue._sum.total ?? 0), "USD")}
          </p>
        </div>
      </header>

      <OrderFilters />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th scope="col" className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pedido</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Pago</th>
                <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-sm font-semibold text-gray-900 hover:text-brand-blue-mid font-mono"
                    >
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {o._count.items} {o._count.items === 1 ? "producto" : "productos"}
                      {" · "}
                      {PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod}
                    </p>
                    {o.trackingNumber && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Truck className="w-3 h-3" aria-hidden="true" />
                        {o.shippingCarrier ? `${o.shippingCarrier} · ` : ""}
                        {o.trackingNumber}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-700">{o.shippingName ?? o.user?.name ?? "–"}</p>
                    <p className="text-xs text-gray-400 break-all">{o.user?.email}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">
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
                  <td className="px-4 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {formatMoney(Number(o.total), o.currency === "ARS" ? "ARS" : "USD")}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label={`Ver pedido ${o.orderNumber}`}
                      >
                        <Eye className="w-4 h-4 text-gray-500" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageOrders.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" aria-hidden="true" />
            <p>No se encontraron pedidos con estos filtros</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
          <PageLink href={pageHref(page - 1)} disabled={page === 1} label="Anterior">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </PageLink>

          <span className="text-sm text-gray-500 px-3">
            Página {page} de {totalPages}
          </span>

          <PageLink href={pageHref(page + 1)} disabled={page === totalPages} label="Siguiente">
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 text-gray-300"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {children}
    </Link>
  );
}
