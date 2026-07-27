import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, MapPin, CreditCard, User } from "lucide-react";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { formatStoreDateTime } from "@/lib/dates";
import { OrderControls } from "@/components/admin/order-controls";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS,
} from "@/lib/order-status";

export const metadata = { title: "Pedido | Admin" };

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.orderNumber}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {formatStoreDateTime(order.createdAt)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 p-6 border-b border-gray-100">
              <Package className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Productos</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Package className="w-5 h-5 m-3.5 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product.slug}`} className="text-sm font-semibold text-gray-900 hover:text-brand-blue-mid">
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {formatPrice(Number(item.price))} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(Number(item.subtotal))}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 px-6 py-4 space-y-2 bg-gray-50/50">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(Number(order.subtotal))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Envío{order.shippingMethod ? ` (${order.shippingMethod})` : ""}</span>
                <span>{Number(order.shippingCost) === 0 ? "Gratis" : formatPrice(Number(order.shippingCost))}</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span>-{formatPrice(Number(order.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Notas del cliente</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <OrderControls
            orderId={order.id}
            status={order.status}
            trackingNumber={order.trackingNumber}
          />

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Cliente</h2>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-gray-900 font-medium">{order.user?.name ?? order.shippingName ?? "–"}</p>
              <p className="text-gray-500">{order.user?.email}</p>
              {(order.shippingPhone || order.user?.phone) && (
                <p className="text-gray-500">{order.shippingPhone ?? order.user?.phone}</p>
              )}
            </div>
            {order.user && (
              <Link href={`/admin/customers/${order.user.id}`} className="text-sm text-brand-blue-mid hover:underline inline-block">
                Ver cliente
              </Link>
            )}
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Envío</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Pago</h2>
            </div>
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
              {order.paymentId && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500 flex-shrink-0">ID de pago</span>
                  <span className="text-gray-900 text-xs truncate">{order.paymentId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
