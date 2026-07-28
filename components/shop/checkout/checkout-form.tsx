"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  MapPin,
  Tag,
  X,
  ShieldCheck,
  Truck,
  AlertTriangle,
  Banknote,
  Landmark,
  CreditCard,
  Coins,
  Wallet,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/hooks/use-cart";
import { checkoutSchema, type CheckoutInput } from "@/validations";
import { createOrder } from "@/actions/orders";
import { getCheckoutQuote, type CheckoutQuote } from "@/actions/checkout";
import type { Address } from "@prisma/client";
import { toast } from "@/hooks/use-toast";
import { ShippingNotice } from "@/components/shop/shipping-notice";

/**
 * Formulario de checkout.
 *
 * Separación de monedas: el resumen se muestra en la moneda del medio de pago
 * elegido (si pagás en pesos, todo el detalle está en pesos), y el envío SIEMPRE
 * en pesos como importe independiente, porque lo cobra un transportista
 * argentino. El envío se cotiza en el servidor contra el código postal que
 * escribe el cliente; ningún importe se calcula en el navegador.
 */

interface CheckoutFormProps {
  userEmail: string;
  userName: string;
  defaultAddress: Address | null;
}

/** Ícono por medio de pago. Se evita depender de emojis. */
const PAYMENT_ICONS: Record<string, typeof Banknote> = {
  CASH_USD: Banknote,
  CASH_ARS: Coins,
  TRANSFER: Landmark,
  MERCADOPAGO: CreditCard,
  USDT: Wallet,
};

/**
 * Formateador único de importes del checkout.
 *
 * Se define acá y no se importa de lib/pricing porque ese módulo trae el
 * cliente de Prisma: importarlo desde un componente de cliente arrastraría toda
 * la capa de base de datos al bundle del navegador.
 */
const money = (value: number, currency: "USD" | "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "ARS" ? 0 : 2,
    maximumFractionDigits: currency === "ARS" ? 0 : 2,
  }).format(value);

/** El envío nunca cambia de moneda: siempre pesos. */
const formatArs = (value: number) => money(value, "ARS");

export function CheckoutForm({ userEmail, userName, defaultAddress }: CheckoutFormProps) {
  const { items, clearCart } = useCartStore();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<string>("MERCADOPAGO");
  const [shippingOptionId, setShippingOptionId] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, startQuote] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const nameParts = userName.split(" ");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" "),
      email: userEmail,
      street: defaultAddress?.street ?? "",
      number: defaultAddress?.number ?? "",
      apartment: defaultAddress?.apartment ?? "",
      city: defaultAddress?.city ?? "",
      province: defaultAddress?.province ?? "",
      postalCode: defaultAddress?.postalCode ?? "",
      phone: defaultAddress?.phone ?? "",
    },
  });

  const postalCode = watch("postalCode");

  // Firma del carrito: evita recotizar cuando el array se recrea sin cambios.
  const cartSignature = items
    .map((i) => `${i.id}:${i.variantId ?? ""}:${i.quantity}`)
    .join("|");

  // Se mantienen en refs para que `requestQuote` no se recree con cada tecla.
  const couponRef = useRef(appliedCoupon);
  couponRef.current = appliedCoupon;
  const shippingRef = useRef(shippingOptionId);
  shippingRef.current = shippingOptionId;

  const requestQuote = useCallback(
    (overrides?: { coupon?: string | null; shippingId?: string | null; cp?: string }) => {
      if (items.length === 0) {
        setQuote(null);
        return;
      }

      const coupon = overrides?.coupon !== undefined ? overrides.coupon : couponRef.current;
      const shippingId =
        overrides?.shippingId !== undefined ? overrides.shippingId : shippingRef.current;
      const cp = overrides?.cp !== undefined ? overrides.cp : postalCode;

      startQuote(async () => {
        const result = await getCheckoutQuote({
          items: items.map((i) => ({
            productId: i.id,
            variantId: i.variantId ?? null,
            quantity: i.quantity,
          })),
          postalCode: cp,
          shippingOptionId: shippingId ?? undefined,
          couponCode: coupon ?? undefined,
        });

        if (result.success && result.data) {
          setQuote(result.data);
          setQuoteError(null);
          // El servidor decide qué envío queda seleccionado: puede haber
          // descartado el elegido si el CP cambió.
          setShippingOptionId(result.data.selectedShippingId);

          if (result.data.couponError) {
            setAppliedCoupon(null);
            toast.add({ title: result.data.couponError, type: "error" });
          }
        } else {
          setQuote(null);
          setQuoteError(result.success ? null : result.error);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cartSignature, postalCode]
  );

  // Recotiza al cambiar el carrito o el código postal (con retardo, para no
  // consultar al transportista con cada tecla).
  useEffect(() => {
    const timer = setTimeout(() => requestQuote(), 500);
    return () => clearTimeout(timer);
  }, [requestQuote]);

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setAppliedCoupon(code);
    requestQuote({ coupon: code });
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    requestQuote({ coupon: null });
  }

  function selectShipping(id: string) {
    setShippingOptionId(id);
    requestQuote({ shippingId: id });
  }

  const selectedOption = quote?.options.find((o) => o.key === paymentOption);
  const selectedShipping = quote?.shippingOptions.find((o) => o.id === shippingOptionId);

  async function onSubmit(data: CheckoutInput) {
    if (items.length === 0 || !quote) return;

    if (!shippingOptionId) {
      toast.add({ title: "Elegí una opción de envío", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createOrder({
        items: items.map((i) => ({
          productId: i.id,
          variantId: i.variantId ?? null,
          quantity: i.quantity,
        })),
        shipping: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          street: data.street,
          number: data.number,
          apartment: data.apartment,
          city: data.city,
          province: data.province,
          postalCode: data.postalCode,
        },
        shippingOptionId,
        paymentOption: paymentOption as never,
        couponCode: appliedCoupon ?? undefined,
        notes: data.notes,
      });

      if (!result.success) {
        toast.add({ title: "No pudimos procesar el pedido", description: result.error, type: "error" });
        // El stock o la tarifa pudieron cambiar: se recotiza.
        requestQuote();
        return;
      }

      clearCart();

      if (result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      } else {
        window.location.href = `/checkout/success?order_id=${result.data!.orderId}`;
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Moneda del desglose: la del medio de pago elegido.
   *
   * Antes el resumen mostraba siempre la moneda base (dólares) aunque el cobro
   * fuera en pesos, así que el detalle y el total estaban en monedas distintas
   * y no cerraban a la vista. Ahora todo el resumen se lee en una sola moneda,
   * salvo el envío, que por definición va siempre en pesos.
   */
  const summaryCurrency = selectedOption?.currency ?? quote?.baseCurrency ?? "USD";

  const fmtSummary = (value: number) => money(value, summaryCurrency);

  /** Subtotal de una línea en la moneda del resumen. */
  const lineSubtotal = (line: { subtotal: number; subtotalArs: number }) =>
    summaryCurrency === "ARS" ? line.subtotalArs : line.subtotal;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Avisos de stock / disponibilidad */}
          {quote?.warnings.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4" role="status">
              <ul className="space-y-1">
                {quote.warnings.map((w) => (
                  <li key={w} className="text-sm text-amber-800 flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 1. Datos personales */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">1</span>
              Datos personales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" {...register("firstName")} className="mt-1 rounded-xl" autoComplete="given-name" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Apellido *</Label>
                <Input id="lastName" {...register("lastName")} className="mt-1 rounded-xl" autoComplete="family-name" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" {...register("email")} type="email" className="mt-1 rounded-xl" autoComplete="email" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" {...register("phone")} className="mt-1 rounded-xl" placeholder="+54 9 221..." autoComplete="tel" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>
          </section>

          {/* 2. Dirección */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">2</span>
              <MapPin className="w-4 h-4" aria-hidden="true" /> Dirección de entrega
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="street">Calle *</Label>
                <Input id="street" {...register("street")} className="mt-1 rounded-xl" autoComplete="address-line1" />
                {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>}
              </div>
              <div>
                <Label htmlFor="number">Número *</Label>
                <Input id="number" {...register("number")} className="mt-1 rounded-xl" />
                {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number.message}</p>}
              </div>
              <div>
                <Label htmlFor="apartment">Piso/Depto</Label>
                <Input id="apartment" {...register("apartment")} className="mt-1 rounded-xl" placeholder="Opcional" />
              </div>
              <div>
                <Label htmlFor="city">Ciudad *</Label>
                <Input id="city" {...register("city")} className="mt-1 rounded-xl" autoComplete="address-level2" />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <Label htmlFor="province">Provincia *</Label>
                <Input id="province" {...register("province")} className="mt-1 rounded-xl" autoComplete="address-level1" />
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province.message}</p>}
              </div>
              <div>
                <Label htmlFor="postalCode">Código postal *</Label>
                <Input
                  id="postalCode"
                  {...register("postalCode")}
                  className="mt-1 rounded-xl"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="1900"
                  aria-describedby="postal-help"
                />
                <p id="postal-help" className="text-xs text-gray-400 mt-1">
                  Con este dato calculamos el costo del envío.
                </p>
                {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notas adicionales</Label>
                <Input id="notes" {...register("notes")} className="mt-1 rounded-xl" placeholder="Instrucciones especiales..." />
              </div>
            </div>

            <div className="mt-5">
              <ShippingNotice variant="inline" />
            </div>
          </section>

          {/* 3. Envío */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">3</span>
              <Truck className="w-4 h-4" aria-hidden="true" /> Envío
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              El costo del envío se cobra siempre en pesos argentinos, aparte del precio del
              producto.
            </p>

            {quote?.isLocalDelivery && (
              <div className="mb-4 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <PackageCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-emerald-900">
                  Tu código postal está dentro de nuestra zona de reparto: la entrega es{" "}
                  <strong>sin cargo y en el día</strong>.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {(quote?.shippingOptions ?? []).map((option) => {
                const checked = shippingOptionId === option.id;

                return (
                  <label
                    key={option.id}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      checked ? "border-brand-blue-mid bg-brand-blue-subtle" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingOption"
                      value={option.id}
                      checked={checked}
                      onChange={() => selectShipping(option.id)}
                      className="mt-1 accent-brand-blue-mid"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{option.serviceName}</p>
                      {option.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                      )}
                      {option.estimatedDays && (
                        <p className="text-xs text-gray-400 mt-1">Estimado: {option.estimatedDays}</p>
                      )}
                    </div>
                    <span className="font-semibold whitespace-nowrap text-gray-900">
                      {option.priceArsFormatted}
                    </span>
                  </label>
                );
              })}

              {loadingQuote && !quote && (
                <div className="flex items-center gap-2 text-sm text-gray-400 p-4">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Cotizando el envío...
                </div>
              )}

              {quote && quote.shippingOptions.length === 0 && (
                <p className="text-sm text-gray-500 p-4">
                  Ingresá tu código postal para ver las opciones de envío.
                </p>
              )}
            </div>
          </section>

          {/* 4. Medio de pago */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">4</span>
              Medio de pago
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              El total se ajusta automáticamente según el medio que elijas.
            </p>

            <div className="space-y-3">
              {(quote?.options ?? []).map((option) => {
                const Icon = PAYMENT_ICONS[option.key] ?? CreditCard;
                const checked = paymentOption === option.key;

                return (
                  <label
                    key={option.key}
                    className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      checked ? "border-brand-blue-mid bg-brand-blue-subtle" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value={option.key}
                      checked={checked}
                      onChange={() => setPaymentOption(option.key)}
                      className="mt-1 accent-brand-blue-mid"
                    />
                    <Icon className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{option.label}</p>
                        {option.surchargePercent > 0 ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            +{option.surchargePercent}%
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Sin recargo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{option.description}</p>
                    </div>
                    <span className="font-semibold text-gray-900 whitespace-nowrap text-right">
                      {option.payableSummary}
                    </span>
                  </label>
                );
              })}

              {loadingQuote && !quote && (
                <div className="flex items-center gap-2 text-sm text-gray-400 p-4">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Calculando totales...
                </div>
              )}
            </div>

            {quote && (
              <p className="text-xs text-gray-400 mt-4">
                Cotización del dólar utilizada: ${quote.exchangeRate.toLocaleString("es-AR")} por USD
                {" · "}
                actualizada el {new Date(quote.rateUpdatedAt).toLocaleString("es-AR")}
              </p>
            )}
          </section>
        </div>

        {/* Resumen */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:sticky lg:top-24 space-y-6">
            <h2 className="font-semibold text-lg text-gray-900">Resumen</h2>

            {quoteError && (
              <p className="text-sm text-red-600" role="alert">{quoteError}</p>
            )}

            <div className="space-y-3 max-h-48 overflow-y-auto">
              {(quote?.lines ?? []).map((line) => (
                <div key={`${line.productId}-${line.variantId ?? ""}`} className="flex justify-between text-sm gap-2">
                  <span className="text-gray-600 truncate">
                    {line.name}
                    {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                  </span>
                  <span className="font-medium whitespace-nowrap">{fmtSummary(lineSubtotal(line))}</span>
                </div>
              ))}
            </div>

            {/* Cupón */}
            <div>
              <Label htmlFor="coupon" className="text-sm">Cupón de descuento</Label>
              <div className="flex gap-2 mt-1">
                {appliedCoupon ? (
                  <div className="flex-1 flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                    <span className="text-green-700 font-semibold text-sm flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" aria-hidden="true" /> {appliedCoupon}
                    </span>
                    <button type="button" onClick={removeCoupon} aria-label="Quitar cupón">
                      <X className="w-4 h-4 text-green-600" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      id="coupon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="CODIGO"
                      className="rounded-xl flex-1 text-sm"
                    />
                    <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={applyCoupon} disabled={loadingQuote}>
                      {loadingQuote ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : "Aplicar"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Productos</span>
                <span>
                  {selectedOption
                    ? fmtSummary(selectedOption.itemsSubtotal)
                    : quote
                      ? fmtSummary(quote.itemsSubtotal)
                      : "—"}
                </span>
              </div>

              {selectedOption && selectedOption.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-{fmtSummary(selectedOption.discount)}</span>
                </div>
              )}

              {selectedOption && selectedOption.surchargeAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-700">
                  <span>Recargo ({selectedOption.surchargePercent}%)</span>
                  <span>+{fmtSummary(selectedOption.surchargeAmount)}</span>
                </div>
              )}

              {/* El envío se muestra SIEMPRE en pesos, en su propia línea. */}
              <div className="flex justify-between text-sm text-gray-600 pt-2 border-t border-gray-100">
                <span>
                  Envío
                  {selectedShipping ? (
                    <span className="block text-xs text-gray-400">{selectedShipping.serviceName}</span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap">
                  {!quote
                    ? "—"
                    : quote.selectedShippingArs === 0
                      ? "Sin cargo"
                      : formatArs(quote.selectedShippingArs)}
                </span>
              </div>

              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 gap-3">
                <span>Total</span>
                <span className="text-right">{selectedOption?.payableSummary ?? "—"}</span>
              </div>

              {selectedOption && selectedOption.currency !== "ARS" && selectedOption.shippingArs > 0 && (
                <p className="text-xs text-gray-400 text-right leading-relaxed">
                  El envío se abona en pesos y no se convierte a dólares.
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2 h-14 text-base font-semibold"
              disabled={submitting || loadingQuote || !quote || !shippingOptionId || items.length === 0}
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Procesando...</>
              ) : selectedOption?.online ? (
                <><CreditCard className="w-5 h-5" aria-hidden="true" /> Pagar con Mercado Pago</>
              ) : (
                <><ShieldCheck className="w-5 h-5" aria-hidden="true" /> Confirmar pedido</>
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {selectedOption?.online
                ? "Pago protegido por Mercado Pago"
                : "Coordinamos el pago y la entrega con vos"}
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
