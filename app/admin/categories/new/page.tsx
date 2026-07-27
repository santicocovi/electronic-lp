import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { CategoryForm } from "@/components/admin/category-form";

export const metadata = { title: "Nueva categoría | Admin" };

export default async function NewCategoryPage() {
  const parents = await db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/categories" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a categorías
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva categoría</h1>
        <p className="text-sm text-gray-500 mt-1">Creá una categoría para organizar tus productos.</p>
      </div>

      <CategoryForm parents={parents} />
    </div>
  );
}
