"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { SlidersHorizontal, LayoutGrid, List, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product/product-card";
import { CatalogFilters } from "./catalog-filters";
import { CatalogPagination } from "./catalog-pagination";
import { ProductSkeleton } from "./product-skeleton";
import { getProducts } from "@/actions/products";
import type { FilterParams, ProductWithRelations, PaginatedResult } from "@/types";
import { cn } from "@/lib/utils";

interface CatalogViewProps {
  initialFilters: FilterParams;
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  brands: { id: string; name: string; slug: string }[];
  priceRange: { min: number; max: number };
}

const SORT_OPTIONS = [
  { value: "newest", label: "Más recientes" },
  { value: "popular", label: "Más vendidos" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
  { value: "name_asc", label: "A–Z" },
];

export function CatalogView({ initialFilters, categories, brands, priceRange }: CatalogViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [result, setResult] = useState<PaginatedResult<ProductWithRelations> | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const data = await getProducts(initialFilters);
      setResult(data);
    });
  }, [searchParams.toString()]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-h-screen">
      {/* Header bar */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {result && (
              <span className="text-xs text-gray-400">({result.total})</span>
            )}
          </Button>

          <div className="flex items-center gap-3">
            <select
              className="text-sm border border-gray-200 rounded-xl px-3 h-9 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue-mid/20"
              value={searchParams.get("sort") ?? "newest"}
              onChange={(e) => updateParam("sort", e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <div className="hidden sm:flex items-center gap-1 border border-gray-200 rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={cn("p-1.5 rounded-lg transition-colors", view === "grid" ? "bg-brand-blue-subtle text-brand-blue-mid" : "text-gray-400 hover:text-gray-600")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn("p-1.5 rounded-lg transition-colors", view === "list" ? "bg-brand-blue-subtle text-brand-blue-mid" : "text-gray-400 hover:text-gray-600")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isPending ? (
          <div className={cn(
            "grid gap-5",
            view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"
          )}>
            {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : result?.items.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🔍</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No encontramos resultados</h3>
            <p className="text-gray-500 mb-6">Probá con otros filtros o busqueda</p>
            <Button onClick={() => router.push(pathname)} variant="outline" className="rounded-xl">
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <>
            <motion.div
              layout
              className={cn(
                "grid gap-5",
                view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 max-w-2xl"
              )}
            >
              {result?.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </motion.div>

            {result && result.totalPages > 1 && (
              <CatalogPagination
                page={result.page}
                totalPages={result.totalPages}
                onPageChange={(p) => updateParam("page", String(p))}
              />
            )}
          </>
        )}
      </div>

      {/* Filters sidebar */}
      <CatalogFilters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories}
        brands={brands}
        priceRange={priceRange}
        onFilter={updateParam}
      />
    </div>
  );
}
