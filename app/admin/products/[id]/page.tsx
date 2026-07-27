import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "Editar producto | Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: "asc" } },
        variants: { orderBy: { order: "asc" } },
        specs: { orderBy: { order: "asc" } },
      },
    }),
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    sku: product.sku ?? "",
    price: Number(product.price),
    comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
    costPrice: product.costPrice ? Number(product.costPrice) : undefined,
    stock: product.stock,
    lowStockAlert: product.lowStockAlert,
    warranty: product.warranty ?? "",
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isNew: product.isNew,
    isOnSale: product.isOnSale,
    freeShipping: product.freeShipping,
    categoryId: product.categoryId ?? undefined,
    brandId: product.brandId ?? undefined,
    metaTitle: product.metaTitle ?? "",
    metaDesc: product.metaDesc ?? "",
    images: product.images.map((img) => ({
      id: img.id, url: img.url, alt: img.alt, order: img.order, isMain: img.isMain,
    })),
    variants: product.variants.map((v) => ({
      id: v.id, name: v.name, value: v.value, type: v.type,
      price: v.price ? Number(v.price) : null, stock: v.stock, sku: v.sku,
      image: v.image, isActive: v.isActive, order: v.order,
    })),
    specs: product.specs.map((s) => ({
      id: s.id, group: s.group, label: s.label, value: s.value, order: s.order,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a productos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>
        <p className="text-sm text-gray-500 mt-1">{product.name}</p>
      </div>

      <ProductForm categories={categories} brands={brands} initialData={initialData} />
    </div>
  );
}
