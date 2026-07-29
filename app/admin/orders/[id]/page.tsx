import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Package, MapPin, CreditCard, User, History, Truck, Mail, Phone,
} from "lucide-react";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { IMAGE_QUALITY_THUMB } from "@/lib/media";
import { formatStoreDateTime } from "@/lib/dates";
import { OrderControls } from "@/components/admin/order-controls";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS,
} from "@/lib/order-status";

export const metadata = { title: "Pedido | Admin" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { slug: true } } } },
      user: { select: { id: true, name: true, email: true, phone: true, emailVerified: true, createdAt: true } },
      history: { orderBy: { createdAt: "desc" } },
      _count: { select: { history: true } },
    },
  });

  if (!order) notFound();

  const currency = order.currency === "ARS" ? "ARS" : "USD";
  const fmt = (value: unknown) => formatMoney(Number(value), currency);

  // Cantidad de pedidos previos del cliente: contexto útil al gestionar.
  const customerOrders = order.user
    ? await db.order.count({ where: { userId: order.user.id } })
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a pedidos
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-mono">
            {order.orderNumber}
          </h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
            Pago: {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </span>
        </div>

        <p className="text-sm text-gray-500 mt-1">{formatStoreDateTime(order.createdAt)}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Productos */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 p-6 border-b border-gray-100">
              <Package className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">Productos</h2>
            </div>

            <div className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="relative w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="48px"
                        quality={IMAGE_QUALITY_THUMB}
                        className="object-contain p-1"
                      />
                    ) : (
                      <Package className="w-5 h-5 m-3.5 text-gray-300" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="text-sm font-semibold text-gray-900 hover:text-brand-blue-mid"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-gray-400">
                      {fmt(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {fmt(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t border-gray-100 px-6 py-4 space-y-2 bg-gray-50/50">
              <Row label="Productos" value={fmt(order.subtotal)} />
              {/* El envío está SIEMPRE en pesos: lo cobra un transportista
                  argentino y no se convierte a la moneda del pedido. */}
              <Row
                label={`Envío${order.shippingMethod ? ` (${order.shippingMethod})` : ""}`}
                value={
                  Number(order.shippingCost) === 0
                    ? "Sin cargo"
                    : formatMoney(Number(order.shippingCost), "ARS")
                }
              />
              {Number(order.discount) > 0 && (
                <Row
                  label={`Descuento${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`-${fmt(order.discount)}`}
                  tone="positive"
                />
              )}
              {Number(order.surchargeAmount) > 0 && (
                <Row
                  label={`Recargo por medio de pago (${Number(order.surchargePercent)}%)`}
                  value={`+${fmt(order.surchargeAmount)}`}
                  tone="warning"
                />
              )}

              <div className="flex justify-between items-baseline text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Mercadería</span>
                <span>{fmt(order.total)}</span>
              </div>

              {order.totalArs && (
                <div className="flex justify-between items-baseline text-sm font-semibold text-gray-700">
                  <span>Total en pesos (con envío)</span>
                  <span>{formatMoney(Number(order.totalArs), "ARS")}</span>
                </div>
              )}

              {order.exchangeRate && currency !== "ARS" && (
                <p className="text-xs text-gray-400 text-right">
                  Cotización usada: ${Number(order.exchangeRate).toLocaleString("es-AR")} por USD
                  {order.shippingProvider ? ` · envío cotizado por ${order.shippingProvider}` : ""}
                  {order.shippingQuotedCp ? ` (CP ${order.shippingQuotedCp})` : ""}
                </p>
              )}
            </div>
          </section>

          {order.notes && (
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Notas del cliente</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </section>
          )}

          {/* Bitácora */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <History className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">Historial del pedido</h2>
            </div>

            {order.history.length === 0 ? (
              <p className="text-sm text-gray-400">
                Sin movimientos registrados. Los pedidos anteriores a esta versión no tienen
                historial, pero los cambios nuevos se van a registrar acá.
              </p>
            ) : (
              <ol className="space-y-4">
                {order.history.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      className="w-2 h-2 rounded-full bg-brand-blue-mid mt-1.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {ORDER_STATUS_LABELS[entry.status] ?? entry.status}
                        </p>
                        {entry.notified && (
                          <span className="text-xs text-emerald-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" aria-hidden="true" /> notificado
                          </span>
                        )}
                      </div>
                      {entry.note && (
                        <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{entry.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatStoreDateTime(entry.createdAt)}
                        {entry.changedBy ? ` · ${entry.changedBy}` : " · automático"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <OrderControls
            orderId={order.id}
            status={order.status}
            trackingNumber={order.trackingNumber}
            carrier={order.shippingCarrier}
            trackingUrl={order.trackingUrl}
          />

          {/* Cliente */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">Comprador</h2>
            </div>

            <div className="text-sm space-y-1.5">
              <p className="text-gray-900 font-medium">
                {order.user?.name ?? order.shippingName ?? "–"}
              </p>

              {order.user?.email && (
                <p className="text-gray-500 flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <a href={`mailto:${order.user.email}`} className="hover:text-brand-blue-mid">
                    {order.user.email}
                  </a>
                </p>
              )}

              {(order.shippingPhone || order.user?.phone) && (
                <p className="text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <a
                    href={`https://wa.me/${(order.shippingPhone ?? order.user?.phone ?? "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-blue-mid"
                  >
                    {order.shippingPhone ?? order.user?.phone}
                  </a>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  order.user?.emailVerified
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {order.user?.emailVerified ? "Email verificado" : "Email sin verificar"}
              </span>
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                {customerOrders} {customerOrders === 1 ? "pedido" : "pedidos"}
              </span>
            </div>

            {order.user && (
              <Link
                href={`/admin/customers/${order.user.id}`}
                className="text-sm text-brand-blue-mid hover:underline inline-block"
              >
                Ver ficha del cliente
              </Link>
            )}
          </section>

          {/* Envío */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">Dirección de entrega</h2>
            </div>

            {order.shippingStreet ? (
              <address className="text-sm text-gray-600 space-y-0.5 not-italic">
                <p>{order.shippingName}</p>
                <p>{order.shippingStreet}</p>
                <p>{order.shippingCity}, {order.shippingProvince}</p>
                <p>CP {order.shippingPostal}</p>
              </address>
            ) : (
              <p className="text-sm text-gray-400">Sin dirección registrada</p>
            )}

            {(order.shippingCarrier || order.trackingNumber) && (
              <div className="pt-3 border-t border-gray-100 text-sm space-y-1">
                {order.shippingCarrier && (
                  <p className="text-gray-600 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                    {order.shippingCarrier}
                  </p>
                )}
                {order.trackingNumber && (
                  <p className="text-gray-600 font-mono text-xs">{order.trackingNumber}</p>
                )}
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue-mid hover:underline text-sm"
                  >
                    Abrir seguimiento
                  </a>
                )}
              </div>
            )}
          </section>

          {/* Pago */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">Pago</h2>
            </div>

            <dl className="text-sm space-y-2">
              <div className="flex justify-between items-center gap-2">
                <dt className="text-gray-500">Estado</dt>
                <dd>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Método</dt>
                <dd className="text-gray-900">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Moneda</dt>
                <dd className="text-gray-900">{currency}</dd>
              </div>
              {order.paidAt && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Pagado el</dt>
                  <dd className="text-gray-900 text-xs">{formatStoreDateTime(order.paidAt)}</dd>
                </div>
              )}
              {order.paymentId && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500 shrink-0">ID de pago</dt>
                  <dd className="text-gray-900 text-xs font-mono truncate">{order.paymentId}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning";
}) {
  const color =
    tone === "positive" ? "text-green-600" : tone === "warning" ? "text-amber-700" : "text-gray-600";

  return (
    <div className={`flex justify-between gap-3 text-sm ${color}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}
