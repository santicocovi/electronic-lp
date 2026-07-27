import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandForm } from "@/components/admin/brand-form";

export const metadata = { title: "Nueva marca | Admin" };

export default function NewBrandPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/brands" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a marcas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva marca</h1>
        <p className="text-sm text-gray-500 mt-1">Agregá una marca para asignarla a tus productos.</p>
      </div>

      <BrandForm />
    </div>
  );
}
