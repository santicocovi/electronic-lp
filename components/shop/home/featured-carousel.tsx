"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight,
  ShoppingCart, Truck, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import { cn, calculateDiscount } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import { ProductMedia } from "@/components/shop/product/product-media";
import type { ProductWithRelations } from "@/types";

/**
 * Carrusel de productos destacados.
 *
 * Tres decisiones que resuelven los problemas que tenía:
 *
 * 1. La imagen no se recorta nunca. El marco mantiene una relación fija y la
 *    foto se dibuja con `object-contain`; se quitó el `scale` en hover, que era
 *    lo único capaz de empujar la imagen fuera del contenedor `overflow-hidden`.
 *    El realce visual ahora lo da la sombra de la tarjeta, no un zoom.
 *
 * 2. El cambio entre productos es inmediato. Antes cada slide se montaba y
 *    desmontaba (`AnimatePresence mode="wait"`), lo que encadenaba la animación
 *    de salida con la de entrada —casi un segundo de espera— y recién entonces
 *    empezaba a descargarse la imagen siguiente. Ahora el slide actual y sus dos
 *    vecinos conviven montados en capas superpuestas: el navegador ya tiene la
 *    imagen decodificada y la transición es un fundido de `opacity` compuesto en
 *    GPU. Solo se mantienen 3 imágenes en memoria, no las 8.
 *
 * 3. Responsive real: una sola columna en mobile y tablet, dos en desktop; los
 *    controles se reordenan y las miniaturas scrollean horizontalmente sin
 *    desbordar la página.
 *
 * Se respeta `prefers-reduced-motion`: sin autoplay y sin transiciones.
 */

interface FeaturedCarouselProps {
  products: ProductWithRelations[];
  title?: string;
  subtitle?: string;
  tag?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

const AUTOPLAY_MS = 5000;

export function FeaturedCarousel({
  products,
  title = "Productos destacados",
  subtitle,
  tag = "Selección",
  viewAllHref,
  viewAllLabel = "Ver todos",
}: FeaturedCarouselProps) {
  const addItem = useCartStore((s) => s.addItem);
  // Respeta la moneda que el visitante eligió ver (USD o ARS).
  const { format: formatMoney } = useCurrency();
  const reduceMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = products.length;

  const goTo = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const autoplay = !paused && !reduceMotion && count > 1;

  // Avance automático. Se detiene con el puntero encima, con el foco dentro y
  // cuando la pestaña no está visible (no tiene sentido pasar slides a ciegas).
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [autoplay, next, index]);

  useEffect(() => {
    function onVisibility() {
      setPaused(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  /**
   * Slides que se mantienen montados: el actual y sus dos vecinos. Es lo que
   * hace que pasar de uno a otro no espere ninguna descarga.
   */
  const mounted = useMemo(() => {
    if (count === 0) return [];
    const set = new Set([index, (index + 1) % count, (index - 1 + count) % count]);
    return [...set];
  }, [index, count]);

  if (count === 0) return null;

  const product = products[index];
  const discount = calculateDiscount(product.comparePrice, product.price);
  const inStock = product.stock > 0;

  function mainImageOf(item: ProductWithRelations): string | null {
    return item.images.find((i) => i.isMain)?.url ?? item.images[0]?.url ?? null;
  }

  function handleAddToCart() {
    if (!inStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      priceArs: product.priceArs,
      image: mainImageOf(product) ?? "/images/placeholder.svg",
      quantity: 1,
      stock: product.stock,
    });
    toast.add({ title: "Agregado al carrito", description: product.name });
  }

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-b from-white via-brand-blue-subtle/40 to-white"
      aria-roledescription="carrusel"
      aria-label={title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Resplandor ambiental detrás de la vitrina. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue-light/10 blur-3xl"
      />

      <div className="container relative mx-auto px-4 section-padding">
        {/* Encabezado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-12"
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

        {/* Vitrina */}
        <div className="relative">
          <div className="grid items-center gap-8 md:gap-12 lg:grid-cols-2">
            {/*
              Marco de imagen: relación fija, sin recortes. Las capas de los
              slides vecinos quedan montadas con opacidad 0, así el cambio es
              instantáneo.
            */}
            <div className="relative order-1 aspect-square w-full overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_60px_-25px_rgba(26,61,107,0.35)] ring-1 ring-gray-900/5 sm:aspect-[4/3] lg:order-none">
              {mounted.map((i) => {
                const item = products[i];
                const isActive = i === index;

                return (
                  <Link
                    key={item.id}
                    href={`/products/${item.slug}`}
                    aria-hidden={!isActive}
                    tabIndex={isActive ? undefined : -1}
                    className={cn(
                      "absolute inset-0 block",
                      reduceMotion ? "" : "transition-opacity duration-300 ease-out",
                      isActive ? "opacity-100" : "pointer-events-none opacity-0"
                    )}
                  >
                    <ProductMedia
                      src={mainImageOf(item)}
                      alt={item.name}
                      productName={item.name}
                      categorySlug={item.category?.slug}
                      categoryName={item.category?.name}
                      // Solo el primer slide es candidato a LCP.
                      priority={i === 0}
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 88vw, 44vw"
                      className="p-6 sm:p-10"
                      illustrationClassName="p-10 sm:p-14"
                    />
                  </Link>
                );
              })}

              {discount > 0 && (
                <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                  -{discount}%
                </span>
              )}
              {product.isNew && discount === 0 && (
                <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-brand-blue-mid px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Nuevo
                </span>
              )}
            </div>

            {/* Detalle: solo texto, se cruza con un fundido corto. */}
            <motion.div
              key={product.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
              className="order-2 lg:order-none"
              aria-live="polite"
            >
              {product.brand && (
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                  {product.brand.name}
                </p>
              )}

              <h3 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 md:text-4xl">
                <Link href={`/products/${product.slug}`} className="transition-colors hover:text-brand-blue-mid">
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
                  {formatMoney(product.price, product.priceArs)}
                </span>
                {product.comparePrice && product.comparePrice > product.price && (
                  <span className="text-lg text-gray-400 line-through">
                    {formatMoney(product.comparePrice, product.comparePriceArs)}
                  </span>
                )}
              </div>

              {/* Beneficios */}
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
                  className="h-12 flex-1 gap-2 rounded-2xl bg-brand-blue-mid px-6 text-white shadow-lg shadow-brand-blue-mid/20 hover:bg-brand-blue-hover sm:flex-none"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {inStock ? "Agregar al carrito" : "Sin stock"}
                </Button>
                <Link href={`/products/${product.slug}`} className="flex-1 sm:flex-none">
                  <Button
                    variant="outline"
                    className="group h-12 w-full gap-2 rounded-2xl border-2 px-6"
                  >
                    Ver detalle
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Controles */}
          {count > 1 && (
            <div className="mt-8 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              {/* Miniaturas */}
              <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {products.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`Ver ${p.name}`}
                    aria-current={i === index}
                    className={cn(
                      "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white transition-all duration-300",
                      i === index
                        ? "ring-2 ring-brand-blue-mid ring-offset-2"
                        : "opacity-50 ring-1 ring-gray-200 hover:opacity-100"
                    )}
                  >
                    <ProductMedia
                      src={mainImageOf(p)}
                      alt=""
                      productName={p.name}
                      categorySlug={p.category?.slug}
                      categoryName={p.category?.name}
                      sizes="56px"
                      className="p-1.5"
                      illustrationClassName="p-1.5"
                    />
                  </button>
                ))}
              </div>

              {/* Flechas */}
              <div className="flex flex-shrink-0 items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Producto anterior"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:border-brand-blue-border hover:text-brand-blue-mid hover:shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Producto siguiente"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-all hover:border-brand-blue-border hover:text-brand-blue-mid hover:shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Progreso del autoplay */}
          {count > 1 && !reduceMotion && (
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
