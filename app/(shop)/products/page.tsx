import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import type { FilterParams } from "@/types";

export const metadata: Metadata = {
  title: "Productos",
  description: "Explorá todo nuestro catálogo de productos electrónicos.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    filter?: string;
    sort?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const filters: FilterParams = {
    category: params.category,
    brand: params.brand,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    inStock: params.inStock === "true",
    isNew: params.filter === "new",
    isOnSale: params.filter === "sale",
    isFeatured: params.filter === "featured",
    sortBy: (params.sort as FilterParams["sortBy"]) ?? "newest",
    search: params.search,
    page: params.page ? Number(params.page) : 1,
    limit: 24,
  };

  const [categories, brands, priceRange] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    db.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    db.product.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: { isActive: true },
    }),
  ]);

  return (
    <div className="pt-16">
      <CatalogView
        initialFilters={filters}
        categories={categories}
        brands={brands}
        priceRange={{
          min: Number(priceRange._min.price ?? 0),
          max: Number(priceRange._max.price ?? 1000000),
        }}
      />
    </div>
  );
}
