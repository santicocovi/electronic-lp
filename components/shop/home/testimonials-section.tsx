"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Testimonial } from "@prisma/client";

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="section-padding bg-gray-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-brand-blue-mid text-sm font-semibold tracking-widest uppercase mb-3">
            Clientes
          </p>
          <h2 className="heading-lg text-gray-900">Lo que dicen nuestros clientes</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed mb-5 text-sm">&ldquo;{t.body}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-blue-subtle flex items-center justify-center text-brand-blue-mid font-bold text-sm">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                  {t.product && (
                    <p className="text-xs text-gray-400">{t.product}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
