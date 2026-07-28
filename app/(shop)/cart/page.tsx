"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/hooks/use-cart";
import { useCurrency } from "@/hooks/use-currency";
import { ShippingNotice } from "@/components/shop/shipping-notice";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const { format: formatPrice, convert, currency } = useCurrency();

  /**
   * Subtotal en la moneda que el visitante está viendo.
   *
   * No se puede sumar en moneda base y convertir al final: los productos con
   * precio en pesos fijado a mano no siguen la cotización, así que el total
   * tiene que armarse línea por línea con el mismo criterio que se muestra en
   * cada una. De lo contrario el total no coincidía con la suma visible.
   */
  const displayedSubtotal = items.reduce(
    (sum, item) => sum + convert(item.price, item.priceArs) * item.quantity,
    0
  );

  const formatDisplayed = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "ARS" ? 0 : 2,
      maximumFractionDigits: currency === "ARS" ? 0 : 2,
    }).format(amount);

  if (items.length === 0) {
    return (
      <div className="pt-24 min-h-screen flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h1>
          <p className="text-gray-500 mb-8">Explorá nuestro catálogo y encontrá algo que te guste.</p>
          <Link href="/products">
            <Button size="lg" className="rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
              Ver productos <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Tu carrito</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={`${item.id}-${item.variantId}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-5 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                  <div className="relative w-24 h-24 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                    {item.variantName && (
                      <p className="text-sm text-gray-400 mt-0.5">{item.variantName}</p>
                    )}
                    <p className="text-brand-blue-mid font-bold mt-1">
                      {formatPrice(item.price, item.priceArs)}
                    </p>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                          className="px-3 py-1.5 hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className="px-4 py-1.5 font-semibold min-w-[2.5rem] text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                          disabled={item.quantity >= item.stock}
                          className="px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold text-gray-900">
                          {formatDisplayed(convert(item.price, item.priceArs) * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.id, item.variantId)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-semibold text-lg text-gray-900 mb-6">Resumen del pedido</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} artículos)</span>
                  <span>{formatDisplayed(displayedSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Envío</span>
                  <span className="text-green-600">A calcular</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-4 mb-2">
                <span>Total</span>
                <span>{formatDisplayed(displayedSubtotal)}</span>
              </div>

              {/*
                Transparencia: el precio de lista no incluye recargos. El
                recargo depende del medio de pago y se muestra en el checkout,
                igual que el envío, que siempre se cobra en pesos.
              */}
              <p className="text-xs text-gray-400 mb-4">
                Los precios no incluyen el envío ni el recargo del medio de pago. Los vas a ver
                detallados en el checkout antes de confirmar.
              </p>

              <div className="mb-6">
                <ShippingNotice variant="compact" />
              </div>

              <Link href="/checkout">
                <Button size="lg" className="w-full rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2 h-14 text-base font-semibold">
                  Ir al checkout <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link href="/products" className="block text-center text-sm text-gray-400 hover:text-brand-blue-mid mt-4 transition-colors">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
