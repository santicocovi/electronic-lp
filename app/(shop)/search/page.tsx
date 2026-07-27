import type { Metadata } from "next";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { CatalogView } from "@/components/shop/catalog/catalog-view";
import { SearchBar } from "@/components/shop/catalog/search-bar";
import type { FilterParams } from "@/types";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Buscá entre todos los productos de Electronic LP.",
};

interface SearchPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const term = query.search?.trim();

  const filters: FilterParams = {
    search: term,
    category: query.category,
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
      <section className="bg-gray-50/60 border-b border-gray-100">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h1 className="heading-lg text-gray-900 mb-2">
            {term ? "Resultados de búsqueda" : "Buscar productos"}
          </h1>
          <p className="text-gray-500 mb-6">
            {term
              ? <>Mostrando resultados para <span className="font-semibold text-gray-700">“{term}”</span></>
              : "Escribí lo que estás buscando y te mostramos lo que tenemos."}
          </p>
          <SearchBar />
        </div>
      </section>

      {term ? (
        <CatalogView
          initialFilters={filters}
          categories={categories}
          brands={brands}
          priceRange={{
            min: Number(priceRange._min.price ?? 0),
            max: Number(priceRange._max.price ?? 1000000),
          }}
        />
      ) : (
        <div className="container mx-auto px-4 py-24 text-center">
          <Search className="w-10 h-10 mx-auto mb-4 text-gray-300" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Empezá tu búsqueda</h2>
          <p className="text-gray-500">Buscá por nombre, descripción o código de producto.</p>
        </div>
      )}
    </div>
  );
}
