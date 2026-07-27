import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { BrandForm } from "@/components/admin/brand-form";

export const metadata = { title: "Editar marca | Admin" };

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await db.brand.findUnique({ where: { id } });

  if (!brand) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/brands" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a marcas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar marca</h1>
        <p className="text-sm text-gray-500 mt-1">{brand.name}</p>
      </div>

      <BrandForm
        initialData={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          logo: brand.logo ?? "",
          description: brand.description ?? "",
          website: brand.website ?? "",
          order: brand.order,
          isActive: brand.isActive,
        }}
      />
    </div>
  );
}
