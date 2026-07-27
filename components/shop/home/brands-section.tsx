"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface BrandsSectionProps {
  brands: { id: string; name: string; slug: string; logo: string | null }[];
}

export function BrandsSection({ brands }: BrandsSectionProps) {
  if (brands.length === 0) return null;

  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-blue-mid">
            Marcas
          </p>
          <h2 className="heading-md text-gray-900">Trabajamos con las mejores</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {brands.map((brand, i) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
            >
              <Link
                href={`/products?brand=${brand.slug}`}
                className="group flex h-24 items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 transition-all duration-300 hover:border-brand-blue-border hover:shadow-md"
              >
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    loading="lazy"
                    className="max-h-10 max-w-full object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                ) : (
                  <span className="text-center text-sm font-semibold text-gray-400 transition-colors group-hover:text-brand-blue-mid">
                    {brand.name}
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
