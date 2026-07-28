import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { CategoryForm } from "@/components/admin/category-form";

export const metadata = { title: "Editar categoría | Admin" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [category, parents] = await Promise.all([
    db.category.findUnique({ where: { id } }),
    // A category can't be its own parent.
    db.category.findMany({
      where: { id: { not: id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/categories" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a categorías
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar categoría</h1>
        <p className="text-sm text-gray-500 mt-1">{category.name}</p>
      </div>

      <CategoryForm
        parents={parents}
        initialData={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? "",
          image: category.image ?? "",
          parentId: category.parentId ?? "",
          order: category.order,
          isActive: category.isActive,
          showInNav: category.showInNav,
          metaTitle: category.metaTitle ?? "",
          metaDesc: category.metaDesc ?? "",
        }}
      />
    </div>
  );
}
