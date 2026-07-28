"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";

interface CatalogFiltersProps {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  brands: { id: string; name: string; slug: string }[];
  priceRange: { min: number; max: number };
  onFilter: (key: string, value: string | null) => void;
  /** Applies several params in a single navigation. */
  onFilterMany: (changes: Record<string, string | null>) => void;
  /** When set, the category is fixed by the route and its filter is hidden. */
  lockedCategorySlug?: string;
}

export function CatalogFilters({
  open, onClose, categories, brands, priceRange, onFilter, onFilterMany, lockedCategorySlug,
}: CatalogFiltersProps) {
  const searchParams = useSearchParams();
  const { format: formatDisplayPrice } = useCurrency();
  const [priceValues, setPriceValues] = useState([priceRange.min, priceRange.max]);

  const activeCategory = searchParams.get("category");
  const activeBrand = searchParams.get("brand");
  const inStock = searchParams.get("inStock") === "true";

  /**
   * Paso del deslizador, derivado del rango real del catálogo.
   * Estaba fijo en 1000, lo que en una tienda con precios en dólares dejaba el
   * control con tres o cuatro posiciones útiles.
   */
  const priceStep = (() => {
    const span = Math.max(1, priceRange.max - priceRange.min);
    const raw = span / 100;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    return Math.max(1, Math.round(raw / magnitude) * magnitude);
  })();

  function applyPrice() {
    onFilterMany({
      minPrice: String(priceValues[0]),
      maxPrice: String(priceValues[1]),
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">Filtros</h2>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-8">
              {/* Category — hidden when the route already fixes it */}
              <div hidden={!!lockedCategorySlug}>
                <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
                  Categoría
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { onFilter("category", null); onClose(); }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                      !activeCategory ? "bg-brand-blue-subtle text-brand-blue-mid font-semibold" : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    Todas
                  </button>
                  {categories.filter(c => !c.parentId).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { onFilter("category", cat.slug); onClose(); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between",
                        activeCategory === cat.slug ? "bg-brand-blue-subtle text-brand-blue-mid font-semibold" : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      {cat.name}
                      {activeCategory === cat.slug && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand */}
              {brands.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
                    Marca
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => { onFilter("brand", null); onClose(); }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                        !activeBrand ? "bg-brand-blue-subtle text-brand-blue-mid font-semibold" : "hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      Todas
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => { onFilter("brand", brand.slug); onClose(); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between",
                          activeBrand === brand.slug ? "bg-brand-blue-subtle text-brand-blue-mid font-semibold" : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        {brand.name}
                        {activeBrand === brand.slug && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">
                  Precio
                </h3>
                <Slider
                  min={priceRange.min}
                  max={priceRange.max}
                  step={priceStep}
                  value={priceValues}
                  onValueChange={(val) => setPriceValues(Array.isArray(val) ? [...val] as number[] : [val as number])}
                  className="mb-4"
                />
                {/*
                  Los valores del filtro están en la moneda base (es lo que se
                  consulta contra la base de datos), pero se muestran en la
                  moneda que el visitante eligió ver. Antes se formateaban
                  siempre como dólares.
                */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>{formatDisplayPrice(priceValues[0])}</span>
                  <span>{formatDisplayPrice(priceValues[1])}</span>
                </div>
                <Button
                  size="sm"
                  className="w-full rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover text-white"
                  onClick={() => { applyPrice(); onClose(); }}
                >
                  Aplicar precio
                </Button>
              </div>

              {/* Stock */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-3">
                  Disponibilidad
                </h3>
                <button
                  onClick={() => { onFilter("inStock", inStock ? null : "true"); onClose(); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-sm transition-colors flex items-center justify-between",
                    inStock ? "bg-brand-blue-subtle text-brand-blue-mid font-semibold" : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  Solo con stock
                  {inStock && <Check className="w-4 h-4" />}
                </button>
              </div>

              {/* Clear all */}
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => {
                  onFilterMany({
                    category: null, brand: null,
                    minPrice: null, maxPrice: null, inStock: null,
                  });
                  onClose();
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
