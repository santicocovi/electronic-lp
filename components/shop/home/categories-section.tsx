"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getCategoryIcon } from "@/lib/category-icons";
import { IMAGE_QUALITY_HERO } from "@/lib/media";
import type { CategoryWithChildren } from "@/types";

/**
 * Sección de categorías de la portada.
 *
 * Diseño: SOLO la categoría principal lleva imagen, en una tarjeta grande. El
 * resto entra en una grilla compacta resuelta con ícono, tipografía y espacio
 * —sin fotografía— para que el bloque se lea limpio y no como un mosaico de
 * imágenes de calidad dispar. Las animaciones se limitan a `transform` y
 * `opacity`, que el navegador compone en la GPU, así que no cuestan repintados
 * ni desplazan el layout. Se respeta `prefers-reduced-motion`.
 *
 * Las categorías llegan por props desde un Server Component, de modo que crear
 * una categoría nueva en el panel la hace aparecer acá sin tocar código.
 */

interface CategoriesSectionProps {
  categories: CategoryWithChildren[];
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  const reduceMotion = useReducedMotion();

  if (categories.length === 0) return null;

  const [lead, ...rest] = categories;

  // Con animación reducida, todo aparece de una sin desplazamientos.
  const fadeUp = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, whileInView: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="section-padding bg-white" aria-labelledby="categories-heading">
      <div className="container mx-auto px-4">
        <motion.header
          {...fadeUp(0)}
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-14"
        >
          <div>
            <p className="text-brand-blue-mid text-xs font-semibold tracking-[0.18em] uppercase mb-3">
              Explorar
            </p>
            <h2 id="categories-heading" className="heading-lg text-gray-900 tracking-tight">
              Categorías
            </h2>
          </div>

          <Link
            href="/products"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors self-start sm:self-auto"
          >
            Ver todo el catálogo
            <ArrowRight
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </motion.header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Tarjeta destacada */}
          <motion.div
            {...fadeUp(0.05)}
            viewport={{ once: true, margin: "-60px" }}
            className="col-span-2 lg:row-span-2"
          >
            <LeadCard category={lead} reduceMotion={Boolean(reduceMotion)} />
          </motion.div>

          {rest.map((category, index) => (
            <motion.div
              key={category.id}
              {...fadeUp(0.08 + Math.min(index, 8) * 0.04)}
              viewport={{ once: true, margin: "-60px" }}
            >
              <CompactCard category={category} reduceMotion={Boolean(reduceMotion)} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadCard({
  category,
  reduceMotion,
}: {
  category: CategoryWithChildren;
  reduceMotion: boolean;
}) {
  const Icon = getCategoryIcon(category.slug, category.name);
  const count = category._count?.products ?? 0;

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative flex h-full min-h-[280px] lg:min-h-[420px] flex-col justify-end overflow-hidden rounded-3xl bg-gray-900 p-6 sm:p-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-mid focus-visible:ring-offset-2"
    >
      {category.image ? (
        <>
          <Image
            src={category.image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            quality={IMAGE_QUALITY_HERO}
            className={`object-cover transition-transform duration-[900ms] ease-out ${
              reduceMotion ? "" : "group-hover:scale-[1.04]"
            }`}
            priority={false}
          />
          {/* Degradado para que el texto sea legible sobre cualquier imagen. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue-deep via-gray-900 to-black" />
      )}

      <div className="relative">
        <span className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm ring-1 ring-white/15">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>

        <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
          {category.name}
        </h3>

        {category.description && (
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70 line-clamp-2">
            {category.description}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-white">
          <span>
            {count > 0 ? `${count} ${count === 1 ? "producto" : "productos"}` : "Ver catálogo"}
          </span>
          <ArrowUpRight
            className={`h-4 w-4 transition-transform duration-300 ${
              reduceMotion ? "" : "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

/**
 * Tarjeta secundaria: sin imagen, a propósito.
 *
 * Solo la categoría principal lleva fotografía; el resto se resuelve con
 * tipografía, aire y un ícono de línea. Para que no se lean como tarjetas
 * vacías, la jerarquía la sostienen tres elementos: el ícono en su contenedor
 * propio, el nombre con peso semibold, y el conteo de productos. En hover se
 * agrega una fina línea de acento superior en lugar de una imagen de fondo.
 */
function CompactCard({
  category,
  reduceMotion,
}: {
  category: CategoryWithChildren;
  reduceMotion: boolean;
}) {
  const Icon = getCategoryIcon(category.slug, category.name);
  const count = category._count?.products ?? 0;

  return (
    <Link
      href={`/categories/${category.slug}`}
      className={`group relative flex h-full min-h-[150px] sm:min-h-[190px] flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60 p-5 transition-all duration-300 hover:border-gray-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-mid focus-visible:ring-offset-2 ${
        reduceMotion ? "" : "hover:-translate-y-1 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)]"
      }`}
    >
      {/* Acento superior: aparece al pasar el puntero, reemplaza a la imagen. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-brand-blue-mid transition-transform duration-500 group-hover:scale-x-100"
      />

      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-100 transition-colors duration-300 group-hover:bg-brand-blue-subtle group-hover:text-brand-blue-mid">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <div>
        <h3 className="text-sm sm:text-base font-semibold leading-tight tracking-tight text-gray-900">
          {category.name}
        </h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
          {count > 0 ? `${count} ${count === 1 ? "producto" : "productos"}` : "Explorar"}
          <ArrowUpRight
            className={`h-3 w-3 opacity-0 transition-all duration-300 ${
              reduceMotion ? "" : "group-hover:opacity-100 group-hover:translate-x-0.5"
            }`}
            aria-hidden="true"
          />
        </p>
      </div>
    </Link>
  );
}
