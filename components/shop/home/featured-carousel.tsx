"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/shop/product/product-card";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";

interface FeaturedCarouselProps {
  products: ProductWithRelations[];
  title?: string;
  subtitle?: string;
  tag?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function FeaturedCarousel({
  products,
  title = "Productos destacados",
  subtitle,
  tag = "Selección",
  viewAllHref,
  viewAllLabel = "Ver todos",
}: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  function scrollByAmount(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>("[data-slide]");
    const amount = (slide?.offsetWidth ?? el.clientWidth * 0.8) + 20;
    el.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <section className="section-padding overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            {tag && (
              <p className="text-brand-blue-mid text-sm font-semibold tracking-widest uppercase mb-2">
                {tag}
              </p>
            )}
            <h2 className="heading-lg text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
          </div>

          <div className="hidden md:flex items-center gap-4 flex-shrink-0 ml-6">
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="flex items-center gap-2 text-brand-blue-mid font-semibold hover:gap-3 transition-all"
              >
                {viewAllLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => scrollByAmount(-1)}
                disabled={!canScrollLeft}
                className={cn(
                  "w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center transition-all",
                  canScrollLeft
                    ? "text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    : "text-gray-300 cursor-not-allowed"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={() => scrollByAmount(1)}
                disabled={!canScrollRight}
                className={cn(
                  "w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center transition-all",
                  canScrollRight
                    ? "text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                    : "text-gray-300 cursor-not-allowed"
                )}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto px-4 md:px-[max(1rem,calc((100vw-80rem)/2+1rem))] pb-2 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {products.map((product) => (
          <div
            key={product.id}
            data-slide
            className="snap-start shrink-0 w-[62%] sm:w-[38%] md:w-[29%] lg:w-[23%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {viewAllHref && (
        <div className="container mx-auto px-4">
          <div className="text-center mt-8 md:hidden">
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-2 text-brand-blue-mid font-semibold"
            >
              {viewAllLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
