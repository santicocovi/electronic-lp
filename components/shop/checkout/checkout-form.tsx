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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/hooks/use-cart";
import { checkoutSchema, type CheckoutInput } from "@/validations";
import { createOrder } from "@/actions/orders";
import { getCheckoutQuote, type CheckoutQuote } from "@/actions/checkout";
import type { ShippingMethod, Address } from "@prisma/client";
import { toast } from "@/hooks/use-toast";
import { ShippingNotice } from "@/components/shop/shipping-notice";

interface CheckoutFormProps {
  userEmail: string;
  userName: string;
  shippingMethods: ShippingMethod[];
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

export function CheckoutForm({
  userEmail,
  userName,
  shippingMethods,
  defaultAddress,
}: CheckoutFormProps) {
  const { items, clearCart } = useCartStore();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<string>("MERCADOPAGO");
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
      shippingMethodId: shippingMethods[0]?.id ?? "",
    },
  });

  const selectedShippingId = watch("shippingMethodId");

  // Firma del carrito: evita recotizar cuando el array se recrea sin cambios.
  const cartSignature = items
    .map((i) => `${i.id}:${i.variantId ?? ""}:${i.quantity}`)
    .join("|");

  const requestQuote = useCallback(
    (coupon: string | null) => {
      if (items.length === 0) {
        setQuote(null);
        return;
      }

      startQuote(async () => {
        const result = await getCheckoutQuote({
          items: items.map((i) => ({
            productId: i.id,
            variantId: i.variantId ?? null,
            quantity: i.quantity,
          })),
          shippingMethodId: selectedShippingId,
          couponCode: coupon ?? undefined,
        });

        if (result.success && result.data) {
          setQuote(result.data);
          setQuoteError(null);
          // El cupón puede haber dejado de ser válido entre recargas.
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
    // `items` se lee dentro; la firma es lo que determina si hay que recotizar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cartSignature, selectedShippingId]
  );

  // Recotiza cuando cambia el carrito o el método de envío.
  const appliedCouponRef = useRef(appliedCoupon);
  appliedCouponRef.current = appliedCoupon;

  useEffect(() => {
    requestQuote(appliedCouponRef.current);
  }, [requestQuote]);

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setAppliedCoupon(code);
    requestQuote(code);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    requestQuote(null);
  }

  const selectedOption = quote?.options.find((o) => o.key === paymentOption);

  async function onSubmit(data: CheckoutInput) {
    if (items.length === 0 || !quote) return;

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
        shippingMethodId: data.shippingMethodId,
        paymentOption: paymentOption as never,
        couponCode: appliedCoupon ?? undefined,
        notes: data.notes,
      });

      if (!result.success) {
        toast.add({ title: "No pudimos procesar el pedido", description: result.error, type: "error" });
        // El stock pudo haber cambiado: se recotiza para reflejarlo.
        requestQuote(appliedCoupon);
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

  const fmtBase = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: quote?.baseCurrency ?? "USD",
      minimumFractionDigits: quote?.baseCurrency === "ARS" ? 0 : 2,
      maximumFractionDigits: quote?.baseCurrency === "ARS" ? 0 : 2,
    }).format(value);

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
                <Input id="postalCode" {...register("postalCode")} className="mt-1 rounded-xl" autoComplete="postal-code" />
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
            <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">3</span>
              <Truck className="w-4 h-4" aria-hidden="true" /> Método de envío
            </h2>
            <div className="space-y-3">
              {shippingMethods.map((method) => (
                <label
                  key={method.id}
                  className="flex items-start gap-4 p-4 border-2 border-gray-100 rounded-xl cursor-pointer transition-colors has-[:checked]:border-brand-blue-mid has-[:checked]:bg-brand-blue-subtle"
                >
                  <input type="radio" {...register("shippingMethodId")} value={method.id} className="mt-1 accent-brand-blue-mid" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{method.name}</p>
                    {method.description && <p className="text-sm text-gray-500">{method.description}</p>}
                    {method.estimatedDays && <p className="text-xs text-gray-400 mt-1">Estimado: {method.estimatedDays}</p>}
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    {Number(method.price) === 0 ? "Gratis" : fmtBase(Number(method.price))}
                  </span>
                </label>
              ))}
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
                    <span className="font-semibold text-gray-900 whitespace-nowrap">
                      {option.totalFormatted}
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
                  <span className="font-medium whitespace-nowrap">{fmtBase(line.subtotal)}</span>
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
                <span>Subtotal</span>
                <span>{quote ? fmtBase(quote.itemsSubtotal) : "—"}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Envío</span>
                <span>{!quote ? "—" : quote.shippingCost === 0 ? "Gratis" : fmtBase(quote.shippingCost)}</span>
              </div>
              {quote && quote.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-{fmtBase(quote.discount)}</span>
                </div>
              )}
              {selectedOption && selectedOption.surchargeAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-700">
                  <span>Recargo ({selectedOption.surchargePercent}%)</span>
                  <span>+{fmtBase(selectedOption.surchargeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{selectedOption?.totalFormatted ?? "—"}</span>
              </div>
              {selectedOption && selectedOption.currency !== quote?.baseCurrency && (
                <p className="text-xs text-gray-400 text-right">
                  Equivale a {fmtBase(quote?.itemsSubtotal ?? 0)} + cargos en {quote?.baseCurrency}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2 h-14 text-base font-semibold"
              disabled={submitting || loadingQuote || !quote || items.length === 0}
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
