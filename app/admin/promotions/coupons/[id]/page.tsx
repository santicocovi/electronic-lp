import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { toDateInputValue } from "@/lib/dates";
import { CouponForm } from "@/components/admin/coupon-form";

export const metadata = { title: "Editar cupón | Admin" };

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupon = await db.coupon.findUnique({ where: { id } });

  if (!coupon) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/promotions/coupons" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a cupones
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar cupón</h1>
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-mono">{coupon.code}</span> · usado {coupon.usageCount} vez(ces)
        </p>
      </div>

      <CouponForm
        initialData={{
          id: coupon.id,
          code: coupon.code,
          description: coupon.description ?? "",
          type: coupon.type,
          value: Number(coupon.value),
          minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : undefined,
          maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : undefined,
          usageLimit: coupon.usageLimit ?? undefined,
          perUserLimit: coupon.perUserLimit ?? undefined,
          isActive: coupon.isActive,
          startsAt: toDateInputValue(coupon.startsAt),
          expiresAt: toDateInputValue(coupon.expiresAt),
        }}
      />
    </div>
  );
}
