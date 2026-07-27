import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { formatStoreDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-status";

export const metadata = { title: "Mis pedidos" };

export default async function ProfileOrdersPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login?callbackUrl=/profile/orders");

  const orders = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, orderNumber: true, status: true, total: true, createdAt: true,
      items: { select: { id: true, name: true, image: true, quantity: true }, take: 4 },
      _count: { select: { items: true } },
    },
  });

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Todavía no hiciste ningún pedido</h2>
        <p className="text-gray-500 mb-6">Cuando compres algo, vas a poder seguirlo desde acá.</p>
        <Link href="/products">
          <Button className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover">
            Explorar productos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/profile/orders/${order.id}`}
          className="block bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-blue-border hover:shadow-sm transition-all"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="font-semibold text-gray-900">#{order.orderNumber}</p>
              <p className="text-xs text-gray-400">
                {formatStoreDate(order.createdAt)} · {order._count.items} producto(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
                {ORDER_STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="font-semibold text-gray-900">{formatPrice(Number(order.total))}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order.items.map((item) => (
              <div key={item.id} className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Package className="w-4 h-4 m-4 text-gray-300" />
                )}
              </div>
            ))}
            {order._count.items > order.items.length && (
              <span className="text-xs text-gray-400 ml-1">
                +{order._count.items - order.items.length} más
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
