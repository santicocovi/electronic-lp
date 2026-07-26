"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/shop/product/product-card";
import type { ProductWithRelations } from "@/types";

interface ProductsSectionProps {
  title: string;
  subtitle?: string;
  products: ProductWithRelations[];
  viewAllHref?: string;
  viewAllLabel?: string;
  tag?: string;
}

export function ProductsSection({
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel = "Ver todos",
  tag,
}: ProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="section-padding">
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
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="hidden md:flex items-center gap-2 text-brand-blue-mid font-semibold hover:gap-3 transition-all flex-shrink-0 ml-6"
            >
              {viewAllLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {viewAllHref && (
          <div className="text-center mt-10 md:hidden">
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-2 text-brand-blue-mid font-semibold"
            >
              {viewAllLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
