import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ProductGallery } from "@/components/shop/product/product-gallery";
import { ProductInfo } from "@/components/shop/product/product-info";
import { ProductSpecs } from "@/components/shop/product/product-specs";
import { ProductsSection } from "@/components/shop/home/products-section";
import type { ProductWithRelations } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

const PRODUCT_SELECT = {
  id: true, name: true, slug: true, shortDescription: true, description: true,
  sku: true, price: true, comparePrice: true, stock: true, isNew: true,
  isOnSale: true, isFeatured: true, freeShipping: true, salesCount: true,
  warranty: true, isActive: true, createdAt: true, internalCode: true,
  images: { select: { id: true, url: true, alt: true, order: true, isMain: true }, orderBy: { order: "asc" as const } },
  variants: { select: { id: true, name: true, value: true, type: true, price: true, stock: true, sku: true, image: true, isActive: true, order: true }, where: { isActive: true }, orderBy: { order: "asc" as const } },
  specs: { select: { id: true, group: true, label: true, value: true, order: true }, orderBy: { order: "asc" as const } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, select: { name: true, shortDescription: true } });
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    openGraph: { title: product.name, description: product.shortDescription ?? undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    select: PRODUCT_SELECT,
  });

  if (!product) notFound();

  // Increment view count (fire & forget)
  db.product.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  // Related products
  const related = await db.product.findMany({
    where: {
      isActive: true,
      categoryId: (product as unknown as { categoryId?: string | null }).categoryId ?? undefined,
      slug: { not: slug },
    },
    select: PRODUCT_SELECT,
    take: 4,
    orderBy: { salesCount: "desc" },
  });

  return (
    <div className="pt-16">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <ProductGallery product={product as unknown as ProductWithRelations} />
          <ProductInfo product={product as unknown as ProductWithRelations} />
        </div>

        {product.specs.length > 0 && (
          <div className="mt-16">
            <ProductSpecs specs={product.specs} />
          </div>
        )}
      </div>

      {related.length > 0 && (
        <ProductsSection
          tag="También te puede interesar"
          title="Productos relacionados"
          products={related as unknown as ProductWithRelations[]}
        />
      )}
    </div>
  );
}
