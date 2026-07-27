import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Nuevo producto | Admin" };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a productos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo producto</h1>
        <p className="text-sm text-gray-500 mt-1">Completá los datos para publicar un nuevo producto.</p>
      </div>

      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
