import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CouponForm } from "@/components/admin/coupon-form";

export const metadata = { title: "Nuevo cupón | Admin" };

export default function NewCouponPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/promotions/coupons" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a cupones
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo cupón</h1>
        <p className="text-sm text-gray-500 mt-1">Creá un código de descuento para tus clientes.</p>
      </div>

      <CouponForm />
    </div>
  );
}
