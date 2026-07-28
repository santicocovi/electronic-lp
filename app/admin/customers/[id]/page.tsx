import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney, getPricingConfig } from "@/lib/pricing";
import { formatStoreDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-status";

export const metadata = { title: "Cliente | Admin" };

const ROLE_LABELS: Record<string, string> = {
  USER: "Cliente",
  ADMIN: "Admin",
  SUPERADMIN: "Superadmin",
};

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, spend, pricing] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { isDefault: "desc" } },
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, orderNumber: true, status: true, total: true, currency: true, createdAt: true,
            _count: { select: { items: true } },
          },
        },
      },
    }),
    db.order.aggregate({
      where: { userId: id, paymentStatus: "APPROVED" },
      _sum: { total: true },
    }),
    getPricingConfig(),
  ]);

  if (!user) notFound();

  const totalSpent = Number(spend._sum.total ?? 0);

  // Los importes de los pedidos están en la moneda base de la tienda.
  const fmt = (value: number) => formatMoney(value, pricing.baseCurrency);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a clientes
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{user.name ?? "Sin nombre"}</h1>
          {user.role !== "USER" && (
            <Badge className="bg-purple-100 text-purple-700 text-[10px]">{ROLE_LABELS[user.role]}</Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Cliente desde {formatStoreDate(user.createdAt)}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500 font-medium">Pedidos</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{user.orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500 font-medium">Total gastado</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{fmt(totalSpent)}</p>
          <p className="text-xs text-gray-400 mt-1">Solo pagos aprobados</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500 font-medium">Ticket promedio</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {fmt(user.orders.length ? Math.round(totalSpent / user.orders.length) : 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-6 border-b border-gray-100">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Historial de pedidos</h2>
          </div>
          {user.orders.length === 0 ? (
            <p className="px-6 py-12 text-sm text-gray-400 text-center">Todavía no hizo ningún pedido</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {user.orders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">#{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">
                      {formatStoreDate(o.createdAt)} · {o._count.items} producto(s)
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${ORDER_STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {formatMoney(Number(o.total), o.currency === "ARS" ? "ARS" : "USD")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Contacto</h2>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              {user.phone && (
                <p className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {user.phone}
                </p>
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Direcciones</h2>
            </div>
            {user.addresses.length === 0 ? (
              <p className="text-sm text-gray-400">Sin direcciones guardadas</p>
            ) : (
              <div className="space-y-3">
                {user.addresses.map((a) => (
                  <div key={a.id} className="text-sm text-gray-600 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{a.label}</span>
                      {a.isDefault && <Badge className="bg-blue-100 text-blue-700 text-[10px]">Principal</Badge>}
                    </div>
                    <p>{a.firstName} {a.lastName}</p>
                    <p>{a.street} {a.number}{a.apartment ? `, ${a.apartment}` : ""}</p>
                    <p>{a.city}, {a.province} (CP {a.postalCode})</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
