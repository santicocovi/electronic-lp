"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { CategoryWithChildren } from "@/types";

const ICONS: Record<string, string> = {
  iphone: "📱",
  macbook: "💻",
  ipad: "⬜",
  "apple-watch": "⌚",
  airpods: "🎧",
  auriculares: "🎧",
  parlantes: "🔊",
  monitores: "🖥️",
  gaming: "🎮",
  "smart-home": "🏠",
  accesorios: "🔌",
};

interface CategoriesSectionProps {
  categories: CategoryWithChildren[];
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  return (
    <section className="section-padding bg-gray-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-brand-blue-mid text-sm font-semibold tracking-widest uppercase mb-3">
            Explorar
          </p>
          <h2 className="heading-lg text-gray-900">Categorías</h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Link
                href={`/categories/${cat.slug}`}
                className="group flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-gray-100 hover:border-brand-blue-border hover:shadow-md transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-blue-subtle flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  {cat.icon ? (
                    <span>{cat.icon}</span>
                  ) : (
                    <span>{ICONS[cat.slug] ?? "📦"}</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
                  {cat.name}
                </span>
                {cat._count && (
                  <span className="text-xs text-gray-400">
                    {cat._count.products} productos
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center mt-10"
        >
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-brand-blue-mid font-semibold hover:gap-3 transition-all"
          >
            Ver todos los productos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
