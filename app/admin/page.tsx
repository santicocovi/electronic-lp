import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney, getPricingConfig } from "@/lib/pricing";
import { TrendingUp, ShoppingBag, Users, Package, AlertTriangle } from "lucide-react";

export const metadata = { title: "Dashboard | Admin" };

export default async function AdminDashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalRevenue, monthRevenue, lastMonthRevenue,
    totalOrders, monthOrders,
    totalCustomers, monthCustomers,
    totalProducts, lowStock, recentOrders, pricing,
  ] = await Promise.all([
    db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "APPROVED" } }),
    db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "APPROVED", createdAt: { gte: startOfMonth } } }),
    db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "APPROVED", createdAt: { gte: lastMonth, lt: startOfMonth } } }),
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.user.count({ where: { role: "USER" } }),
    db.user.count({ where: { role: "USER", createdAt: { gte: startOfMonth } } }),
    db.product.count({ where: { isActive: true } }),
    db.product.findMany({ where: { isActive: true, stock: { lte: 5 } }, select: { id: true, name: true, stock: true, slug: true }, orderBy: { stock: "asc" }, take: 5 }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, orderNumber: true, total: true, currency: true, status: true, paymentStatus: true, createdAt: true, shippingName: true, items: { take: 1, select: { name: true } } } }),
    getPricingConfig(),
  ]);

  /**
   * Los importes de mercadería de los pedidos están en la moneda base de la
   * tienda, no siempre en dólares. Formatearlos con un default fijo mostraba el
   * símbolo equivocado cuando la tienda opera en pesos.
   */
  const fmt = (value: unknown) => formatMoney(Number(value ?? 0), pricing.baseCurrency);

  const revenueGrowth = lastMonthRevenue._sum.total
    ? Math.round(((Number(monthRevenue._sum.total ?? 0) - Number(lastMonthRevenue._sum.total)) / Number(lastMonthRevenue._sum.total)) * 100)
    : 0;

  const stats = [
    {
      label: "Ingresos del mes",
      value: fmt(monthRevenue._sum.total),
      icon: TrendingUp,
      change: `${revenueGrowth > 0 ? "+" : ""}${revenueGrowth}% vs mes anterior`,
      color: "bg-blue-50 text-brand-blue-mid",
    },
    {
      label: "Pedidos del mes",
      value: monthOrders,
      icon: ShoppingBag,
      change: `${totalOrders} pedidos en total`,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Nuevos clientes",
      value: monthCustomers,
      icon: Users,
      change: `${totalCustomers} clientes en total`,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Productos activos",
      value: totalProducts,
      icon: Package,
      change: `${lowStock.length} con stock bajo`,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-indigo-100 text-indigo-700",
    DELIVERED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenido al panel de administración de Electronic LP</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.change}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Últimos pedidos</h2>
            <Link href="/admin/orders" className="text-sm text-brand-blue-mid hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">#{order.orderNumber}</p>
                  <p className="text-xs text-gray-400">{order.shippingName}</p>
                </div>
                <div className="text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {order.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatMoney(Number(order.total), order.currency === "ARS" ? "ARS" : "USD")}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 p-6 border-b border-gray-100">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Stock bajo</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {lowStock.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">
                Todo el stock está en niveles normales
              </p>
            ) : (
              lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-4">
                  <p className="text-sm text-gray-700 truncate max-w-[160px]">{p.name}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.stock === 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                    {p.stock === 0 ? "Sin stock" : `${p.stock} u.`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
