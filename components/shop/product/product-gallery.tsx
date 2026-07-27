"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";

interface ProductGalleryProps {
  product: ProductWithRelations;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length > 0
    ? product.images
    : [{ id: "placeholder", url: "/images/placeholder.svg", alt: product.name, order: 0, isMain: true }];

  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  function prev() { setCurrent((i) => (i - 1 + images.length) % images.length); }
  function next() { setCurrent((i) => (i + 1) % images.length); }

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative aspect-square bg-gray-50 rounded-3xl overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <Image
              src={images[current].url}
              alt={images[current].alt ?? product.name}
              fill
              className="object-contain p-8 cursor-zoom-in"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              onClick={() => setZoomed(true)}
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={() => setZoomed(true)}
          className="absolute bottom-3 right-3 w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
                i === current ? "border-brand-blue-mid" : "border-transparent hover:border-gray-200"
              )}
            >
              <Image
                src={img.url}
                alt={img.alt ?? ""}
                width={64}
                height={64}
                className="object-contain w-full h-full p-1 bg-gray-50"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setZoomed(false)}
          >
            <div className="relative max-w-3xl w-full aspect-square">
              <Image
                src={images[current].url}
                alt={images[current].alt ?? product.name}
                fill
                className="object-contain"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
