import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { MailWarning } from "lucide-react";
import { CheckoutForm } from "@/components/shop/checkout/checkout-form";
import { ResendVerification } from "@/components/shop/auth/resend-verification";
import { PaymentTerms } from "@/components/shop/payment-terms";
import { getCurrentUser } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?callbackUrl=/checkout");

  // Puerta de verificación de email: se comprueba contra la base de datos, no
  // contra el JWT, que puede haberse emitido antes de que el usuario verificara.
  if (!user.emailVerified) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50/50">
        <div className="container mx-auto px-4 py-10 max-w-lg">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
            <MailWarning className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmá tu email para comprar</h1>
            <p className="text-gray-500 text-sm mb-6">
              Por seguridad necesitamos verificar <strong className="text-gray-900">{user.email}</strong>{" "}
              antes de procesar tu primer pedido. Revisá tu bandeja de entrada y la carpeta de spam.
            </p>

            <ResendVerification defaultEmail={user.email} hideInput />

            <p className="mt-6 text-sm text-gray-400">
              Tu carrito queda guardado.{" "}
              <Link href="/cart" className="text-brand-blue-mid font-medium hover:underline">
                Volver al carrito
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [shippingMethods, defaultAddress] = await Promise.all([
    db.shippingMethod.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    db.address.findFirst({ where: { userId: user.id, isDefault: true } }),
  ]);

  return (
    <div className="pt-24 min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">Checkout</h1>

        <CheckoutForm
          userEmail={user.email}
          userName={user.name ?? ""}
          shippingMethods={shippingMethods}
          defaultAddress={defaultAddress}
        />

        <div className="mt-10">
          <PaymentTerms />
        </div>
      </div>
    </div>
  );
}
