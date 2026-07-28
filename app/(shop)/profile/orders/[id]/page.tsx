import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Package, MapPin, Truck } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { formatStoreDateTime } from "@/lib/dates";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS,
} from "@/lib/order-status";

export const metadata = { title: "Detalle del pedido" };

export default async function ProfileOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect(`/login?callbackUrl=/profile/orders/${id}`);

  // Scoped to the signed-in user so nobody can read someone else's order.
  const order = await db.order.findFirst({
    where: { id, userId },
    include: { items: { include: { product: { select: { slug: true } } } } },
  });

  if (!order) notFound();

  /**
   * Los importes de mercadería del pedido están en la moneda con la que se
   * cerró (`order.currency`), no siempre en dólares. Formatearlos con el
   * default USD mostraba "US$ 950.000" en pedidos cerrados en pesos.
   * El envío es la excepción: siempre va en ARS.
   */
  const orderCurrency = order.currency === "ARS" ? "ARS" : "USD";
  const fmt = (value: unknown) => formatMoney(Number(value), orderCurrency);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/profile/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a mis pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">Pedido #{order.orderNumber}</h2>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">{formatStoreDateTime(order.createdAt)}</p>
      </div>

      {order.trackingNumber && (
        <div className="bg-brand-blue-subtle border border-brand-blue-border rounded-2xl p-5 flex items-start gap-3">
          <Truck className="w-5 h-5 text-brand-blue-mid flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-brand-blue-dark text-sm">Tu pedido está en camino</p>
            <p className="text-sm text-gray-600 mt-0.5">
              Número de seguimiento: <span className="font-mono font-semibold">{order.trackingNumber}</span>
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-gray-100">
          <Package className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Productos</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Package className="w-5 h-5 m-4 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.product.slug}`} className="text-sm font-semibold text-gray-900 hover:text-brand-blue-mid">
                  {item.name}
                </Link>
                <p className="text-xs text-gray-400">{fmt(item.price)} × {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{fmt(item.subtotal)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 px-5 py-4 space-y-2 bg-gray-50/50">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Productos</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{fmt(order.discount)}</span>
            </div>
          )}
          {/* El envío se cobra siempre en pesos y no se convierte a dólares. */}
          <div className="flex justify-between text-sm text-gray-600">
            <span>Envío{order.shippingMethod ? ` (${order.shippingMethod})` : ""}</span>
            <span>
              {Number(order.shippingCost) === 0
                ? "Sin cargo"
                : formatMoney(Number(order.shippingCost), "ARS")}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Mercadería</span>
            <span>{fmt(order.total)}</span>
          </div>
          {order.totalArs !== null && (
            <div className="flex justify-between text-sm font-semibold text-gray-700">
              <span>Total en pesos (con envío)</span>
              <span>{formatMoney(Number(order.totalArs), "ARS")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Shipping */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Envío</h3>
          </div>
          {order.shippingStreet ? (
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>{order.shippingName}</p>
              <p>{order.shippingStreet}</p>
              <p>{order.shippingCity}, {order.shippingProvince}</p>
              <p>CP {order.shippingPostal}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Sin dirección registrada</p>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <h3 className="font-semibold text-gray-900">Pago</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Estado</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Método</span>
              <span className="text-gray-900">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
            </div>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Notas</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
