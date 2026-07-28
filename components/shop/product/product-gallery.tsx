"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductIllustration } from "@/components/shop/product/product-illustration";
import type { ProductWithRelations } from "@/types";

/**
 * Galería de producto.
 *
 * Estética sobria: fondo neutro, mucho aire alrededor del producto, controles
 * que aparecen al acercar el puntero y no compiten con la imagen. El visor
 * ampliado es un diálogo modal accesible: atrapa Escape, se puede navegar con
 * las flechas y bloquea el scroll del fondo mientras está abierto.
 */

interface ProductGalleryProps {
  product: ProductWithRelations;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const reduceMotion = useReducedMotion();

  // Sin fotografías cargadas se dibuja la ilustración de la familia del
  // producto, en lugar del placeholder gris que era igual para todo el catálogo.
  const hasImages = product.images.length > 0;
  const images = hasImages
    ? product.images
    : [{ id: "illustration", url: "", alt: product.name, order: 0, isMain: true }];

  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const total = images.length;

  const prev = useCallback(() => setCurrent((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);

  // Teclado: flechas para navegar, Escape para cerrar el visor.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
      if (event.key === "Escape") setZoomed(false);
    }

    if (!zoomed) return;

    window.addEventListener("keydown", onKeyDown);
    // Se evita el scroll del fondo mientras el visor está abierto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomed, prev, next]);

  const activeImage = images[current];

  return (
    <div className="lg:sticky lg:top-24">
      {/* Imagen principal */}
      <div className="group relative aspect-square overflow-hidden rounded-[28px] bg-[#f5f5f7]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeImage.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {hasImages ? (
              <Image
                src={activeImage.url}
                alt={activeImage.alt ?? product.name}
                fill
                className="object-contain p-10 sm:p-14"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-10 sm:p-14">
                <ProductIllustration
                  productName={product.name}
                  categorySlug={product.category?.slug}
                  categoryName={product.category?.name}
                  label={product.name}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Ampliar: solo tiene sentido con una fotografía real detrás. */}
        {hasImages && (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Ampliar imagen"
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-700 backdrop-blur-sm shadow-sm transition-all duration-300 hover:bg-white focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Expand className="h-4 w-4" aria-hidden="true" />
        </button>
        )}

        {total > 1 && (
          <>
            <GalleryArrow side="left" onClick={prev} label="Imagen anterior" />
            <GalleryArrow side="right" onClick={next} label="Imagen siguiente" />

            {/* Contador discreto, útil en móvil donde no hay hover. */}
            <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-gray-600 backdrop-blur-sm sm:hidden">
              {current + 1} / {total}
            </span>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {total > 1 && (
        <div
          className="mt-4 flex gap-3 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Imágenes del producto"
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Ver imagen ${i + 1} de ${total}`}
              onClick={() => setCurrent(i)}
              className={cn(
                "relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl bg-[#f5f5f7] transition-all duration-200",
                "ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
                i === current ? "ring-gray-900" : "ring-gray-200/70 hover:ring-gray-300"
              )}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="68px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}

      {/* Visor ampliado */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Imagen ampliada de ${product.name}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/98 p-4 backdrop-blur-sm"
            onClick={() => setZoomed(false)}
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="Cerrar"
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div
              className="relative aspect-square w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={activeImage.url}
                alt={activeImage.alt ?? product.name}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {total > 1 && (
              <>
                <GalleryArrow
                  side="left"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  label="Imagen anterior"
                  alwaysVisible
                />
                <GalleryArrow
                  side="right"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  label="Imagen siguiente"
                  alwaysVisible
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GalleryArrow({
  side,
  onClick,
  label,
  alwaysVisible = false,
}: {
  side: "left" | "right";
  onClick: (event: React.MouseEvent) => void;
  label: string;
  alwaysVisible?: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
        "bg-white/85 text-gray-700 shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
        side === "left" ? "left-4" : "right-4",
        alwaysVisible ? "" : "sm:opacity-0 sm:group-hover:opacity-100"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
