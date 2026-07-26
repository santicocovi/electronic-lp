import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/shop/checkout/checkout-form";
import { db } from "@/lib/db";

export default async function CheckoutPage() {
  const session = await auth();

  if (!session) redirect("/login?callbackUrl=/checkout");

  const [shippingMethods, user] = await Promise.all([
    db.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    }),
    db.user.findUnique({
      where: { id: session.user!.id },
      include: { addresses: { where: { isDefault: true }, take: 1 } },
    }),
  ]);

  const defaultAddress = user?.addresses[0];

  return (
    <div className="pt-24 min-h-screen bg-gray-50/50">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Checkout</h1>
        <CheckoutForm
          userId={session.user!.id!}
          userEmail={session.user!.email!}
          userName={session.user?.name ?? ""}
          shippingMethods={shippingMethods}
          defaultAddress={defaultAddress ?? null}
        />
      </div>
    </div>
  );
}
