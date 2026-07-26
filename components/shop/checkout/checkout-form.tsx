"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CreditCard, MapPin, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/validations";
import { createOrder } from "@/actions/orders";
import type { ShippingMethod, Address } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

interface CheckoutFormProps {
  userId: string;
  userEmail: string;
  userName: string;
  shippingMethods: ShippingMethod[];
  defaultAddress: Address | null;
}

export function CheckoutForm({ userId, userEmail, userName, shippingMethods, defaultAddress }: CheckoutFormProps) {
  const { items, subtotal, clearCart } = useCartStore();
  const { toast } = useToast();
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const nameParts = userName.split(" ");

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
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
  const selectedShipping = shippingMethods.find((m) => m.id === selectedShippingId);
  const shippingCost = Number(selectedShipping?.price ?? 0);
  const total = subtotal() + shippingCost - couponDiscount;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, orderTotal: subtotal() }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon(couponInput.toUpperCase());
        setCouponDiscount(data.discount);
        toast({ title: `Cupón aplicado: -${formatPrice(data.discount)}` });
      } else {
        toast({ title: "Cupón inválido", variant: "destructive" });
      }
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function onSubmit(data: CheckoutInput) {
    if (items.length === 0) return;
    const result = await createOrder({
      userId,
      items: items.map((i) => ({
        productId: i.id,
        variantId: i.variantId,
        name: i.name,
        image: i.image,
        price: i.price,
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
      shippingCost,
      couponCode: appliedCoupon ?? undefined,
      couponDiscount,
      notes: data.notes,
    });

    if (result.success && result.data?.preferenceUrl) {
      clearCart();
      window.location.href = result.data.preferenceUrl;
    } else {
      toast({ title: "Error al procesar el pedido", description: (result as {error?: string}).error, variant: "destructive" });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">1</span>
              Datos personales
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input {...register("firstName")} className="mt-1 rounded-xl" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <Label>Apellido *</Label>
                <Input {...register("lastName")} className="mt-1 rounded-xl" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <Label>Email *</Label>
                <Input {...register("email")} type="email" className="mt-1 rounded-xl" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input {...register("phone")} className="mt-1 rounded-xl" placeholder="+54 9 221..." />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">2</span>
              <MapPin className="w-4 h-4" /> Dirección de entrega
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label>Calle *</Label>
                <Input {...register("street")} className="mt-1 rounded-xl" />
                {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>}
              </div>
              <div>
                <Label>Número *</Label>
                <Input {...register("number")} className="mt-1 rounded-xl" />
                {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number.message}</p>}
              </div>
              <div>
                <Label>Piso/Depto</Label>
                <Input {...register("apartment")} className="mt-1 rounded-xl" placeholder="Opcional" />
              </div>
              <div>
                <Label>Ciudad *</Label>
                <Input {...register("city")} className="mt-1 rounded-xl" />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <Label>Provincia *</Label>
                <Input {...register("province")} className="mt-1 rounded-xl" />
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province.message}</p>}
              </div>
              <div>
                <Label>Código postal *</Label>
                <Input {...register("postalCode")} className="mt-1 rounded-xl" />
                {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode.message}</p>}
              </div>
              <div className="col-span-2">
                <Label>Notas adicionales</Label>
                <Input {...register("notes")} className="mt-1 rounded-xl" placeholder="Instrucciones especiales..." />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-lg text-gray-900 mb-5 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-brand-blue-mid text-white text-sm flex items-center justify-center font-bold">3</span>
              Método de envío
            </h2>
            <div className="space-y-3">
              {shippingMethods.map((method) => (
                <label key={method.id} className="flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-colors has-[:checked]:border-brand-blue-mid has-[:checked]:bg-brand-blue-subtle">
                  <input type="radio" {...register("shippingMethodId")} value={method.id} className="mt-1 accent-brand-blue-mid" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{method.name}</p>
                    {method.description && <p className="text-sm text-gray-500">{method.description}</p>}
                    {method.estimatedDays && <p className="text-xs text-gray-400 mt-1">Estimado: {method.estimatedDays}</p>}
                  </div>
                  <span className="font-semibold">{Number(method.price) === 0 ? "Gratis" : formatPrice(Number(method.price))}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24 space-y-6">
            <h2 className="font-semibold text-lg text-gray-900">Resumen</h2>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <div key={`${item.id}-${item.variantId}`} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate max-w-[170px]">{item.name} {item.quantity > 1 ? `×${item.quantity}` : ""}</span>
                  <span className="font-medium ml-2">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div>
              <Label className="text-sm">Cupón de descuento</Label>
              <div className="flex gap-2 mt-1">
                {appliedCoupon ? (
                  <div className="flex-1 flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                    <span className="text-green-700 font-semibold text-sm flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {appliedCoupon}</span>
                    <button onClick={() => { setAppliedCoupon(null); setCouponDiscount(0); setCouponInput(""); }}>
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="CODIGO" className="rounded-xl flex-1 text-sm" />
                    <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={applyCoupon} disabled={checkingCoupon}>
                      {checkingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatPrice(subtotal())}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Envío</span><span>{shippingCost === 0 ? "Gratis" : formatPrice(shippingCost)}</span></div>
              {couponDiscount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Descuento</span><span>-{formatPrice(couponDiscount)}</span></div>}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>

            <Button type="submit" size="lg" className="w-full rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2 h-14 text-base font-semibold" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</> : <><CreditCard className="w-5 h-5" /> Pagar con Mercado Pago</>}
            </Button>
            <p className="text-xs text-gray-400 text-center">Pago 100% seguro · Mercado Pago</p>
          </div>
        </div>
      </div>
    </form>
  );
}
