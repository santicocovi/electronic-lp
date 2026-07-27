"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight,
  ShoppingCart, Truck, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import { cn, formatPrice, calculateDiscount } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";

interface FeaturedCarouselProps {
  products: ProductWithRelations[];
  title?: string;
  subtitle?: string;
  tag?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

const AUTOPLAY_MS = 7000;

export function FeaturedCarousel({
  products,
  title = "Productos destacados",
  subtitle,
  tag = "Selección",
  viewAllHref,
  viewAllLabel = "Ver todos",
}: FeaturedCarouselProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [index, setIndex] = useState(0);
  // Direction drives whether the slide enters from the left or the right.
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const count = products.length;

  const goTo = useCallback((next: number, dir: number) => {
    setDirection(dir);
    setIndex(((next % count) + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  // Auto-advance, paused on hover/focus and when the section is offscreen.
  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [paused, count, next, index]);

  // Respect users who prefer reduced motion by disabling autoplay for them.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) setPaused(true);
  }, []);

  if (count === 0) return null;

  const product = products[index];
  const image =
    product.images.find((i) => i.isMain)?.url ??
    product.images[0]?.url ??
    "/images/placeholder.svg";
  const discount = calculateDiscount(product.comparePrice, product.price);
  const inStock = product.stock > 0;

  function handleAddToCart() {
    if (!inStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image,
      quantity: 1,
      stock: product.stock,
    });
    toast.add({ title: "Agregado al carrito", description: product.name });
  }

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white via-brand-blue-subtle/40 to-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Soft ambient glow behind the showcase */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue-light/10 blur-3xl"
      />

      <div className="container relative mx-auto px-4 section-padding">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14"
        >
          <div>
            {tag && (
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-blue-mid">
                {tag}
              </p>
            )}
            <h2 className="heading-lg text-gray-900">{title}</h2>
            {subtitle && <p className="mt-2 text-gray-500">{subtitle}</p>}
          </div>

          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="group inline-flex items-center gap-2 font-semibold text-brand-blue-mid"
            >
              {viewAllLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </motion.div>

        {/* Showcase */}
        <div ref={containerRef} className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={product.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -48 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="grid items-center gap-8 md:gap-12 lg:grid-cols-2"
            >
              {/* Image */}
              <Link
                href={`/products/${product.slug}`}
                className="group relative order-1 block lg:order-none"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_-25px_rgba(26,61,107,0.35)] ring-1 ring-gray-900/5 sm:aspect-[16/11]">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-[1.04] sm:p-12"
                  />

                  {discount > 0 && (
                    <span className="absolute left-5 top-5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      -{discount}%
                    </span>
                  )}
                  {product.isNew && discount === 0 && (
                    <span className="absolute left-5 top-5 rounded-full bg-brand-blue-mid px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Nuevo
                    </span>
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="order-2 lg:order-none">
                {product.brand && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {product.brand.name}
                  </p>
                )}

                <h3 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 md:text-4xl">
                  <Link href={`/products/${product.slug}`} className="hover:text-brand-blue-mid transition-colors">
                    {product.name}
                  </Link>
                </h3>

                {product.shortDescription && (
                  <p className="mt-4 max-w-md leading-relaxed text-gray-500">
                    {product.shortDescription}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900 md:text-4xl">
                    {formatPrice(product.price)}
                  </span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                  )}
                </div>

                {/* Perks */}
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
                  {product.freeShipping && (
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-brand-blue-mid" /> Envío gratis
                    </span>
                  )}
                  {product.warranty && (
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-brand-blue-mid" /> {product.warranty}
                    </span>
                  )}
                  <span className={cn("inline-flex items-center gap-1.5", !inStock && "text-red-500")}>
                    {inStock ? "En stock" : "Sin stock"}
                  </span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleAddToCart}
                    disabled={!inStock}
                    className="h-12 gap-2 rounded-2xl bg-brand-blue-mid px-6 text-white shadow-lg shadow-brand-blue-mid/20 hover:bg-brand-blue-hover"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {inStock ? "Agregar al carrito" : "Sin stock"}
                  </Button>
                  <Link href={`/products/${product.slug}`}>
                    <Button
                      variant="outline"
                      className="group h-12 gap-2 rounded-2xl border-2 px-6"
                    >
                      Ver detalle
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          {count > 1 && (
            <div className="mt-10 flex items-center justify-between gap-6">
              {/* Thumbnails */}
              <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {products.map((p, i) => {
                  const thumb =
                    p.images.find((img) => img.isMain)?.url ??
                    p.images[0]?.url ??
                    "/images/placeholder.svg";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => goTo(i, i > index ? 1 : -1)}
                      aria-label={`Ver ${p.name}`}
                      aria-current={i === index}
                      className={cn(
                        "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white transition-all duration-300",
                        i === index
                          ? "ring-2 ring-brand-blue-mid ring-offset-2"
                          : "opacity-50 ring-1 ring-gray-200 hover:opacity-100"
                      )}
                    >
                      <Image src={thumb} alt="" fill sizes="56px" className="object-contain p-1.5" />
                    </button>
                  );
                })}
              </div>

              {/* Arrows */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Anterior"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:border-brand-blue-border hover:text-brand-blue-mid hover:shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Siguiente"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:border-brand-blue-border hover:text-brand-blue-mid hover:shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Autoplay progress */}
          {count > 1 && (
            <div className="mt-6 h-0.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                key={`${product.id}-${paused}`}
                className="h-full bg-brand-blue-mid"
                initial={{ width: "0%" }}
                animate={{ width: paused ? "0%" : "100%" }}
                transition={{ duration: paused ? 0 : AUTOPLAY_MS / 1000, ease: "linear" }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
