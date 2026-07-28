import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { getCategoryIcon } from "@/lib/category-icons";
import type { FilterParams } from "@/types";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: string;
    page?: string;
  }>;
}

async function getCategory(slug: string) {
  return db.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true, name: true, slug: true, description: true, image: true,
      metaTitle: true, metaDesc: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Categoría no encontrada" };

  return {
    title: category.metaTitle || category.name,
    description:
      category.metaDesc ||
      category.description ||
      `Comprá ${category.name} en Electronic LP. Envíos a todo el país.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const category = await getCategory(slug);
  if (!category) notFound();

  const CategoryIcon = getCategoryIcon(category.slug, category.name);

  const filters: FilterParams = {
    category: slug,
    brand: query.brand,
    minPrice: query.minPrice ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
    inStock: query.inStock === "true",
    sortBy: (query.sort as FilterParams["sortBy"]) ?? "newest",
    page: query.page ? Number(query.page) : 1,
    limit: 24,
  };

  const [categories, brands, priceRange] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    db.brand.findMany({
      where: { isActive: true, products: { some: { categoryId: category.id, isActive: true } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    db.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: { isActive: true, categoryId: category.id },
    }),
  ]);

  return (
    <div className="pt-16">
      {/* Category header */}
      <section className="bg-gray-50/60 border-b border-gray-100">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-5">
            {/* Si la categoría tiene imagen se muestra; si no, un ícono de línea.
                Nunca un emoji: la iconografía se resuelve por slug. */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-brand-blue-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
              {category.image ? (
                <img src={category.image} alt={category.name} className="w-full h-full object-contain p-2" />
              ) : (
                <CategoryIcon className="w-7 h-7 md:w-8 md:h-8 text-brand-blue-mid" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="heading-lg text-gray-900">{category.name}</h1>
              <p className="text-gray-500 mt-1">
                {category._count.products}{" "}
                {category._count.products === 1 ? "producto disponible" : "productos disponibles"}
              </p>
            </div>
          </div>

          {category.description && (
            <p className="text-gray-600 mt-5 max-w-2xl leading-relaxed">{category.description}</p>
          )}
        </div>
      </section>

      <CatalogView
        initialFilters={filters}
        categories={categories}
        brands={brands}
        priceRange={{
          min: Number(priceRange._min.price ?? 0),
          max: Number(priceRange._max.price ?? 1000000),
        }}
        lockedCategorySlug={slug}
      />
    </div>
  );
}
