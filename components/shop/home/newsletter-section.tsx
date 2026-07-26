"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeNewsletter } from "@/actions/newsletter";
import { newsletterSchema, type NewsletterInput } from "@/validations";

export function NewsletterSection() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema) });

  async function onSubmit(data: NewsletterInput) {
    const result = await subscribeNewsletter(data.email);
    if (result.success) setSubmitted(true);
  }

  return (
    <section className="section-padding bg-brand-blue-subtle">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mx-auto text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-brand-blue-mid/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-6 h-6 text-brand-blue-mid" />
          </div>
          <h2 className="heading-md text-gray-900 mb-3">Suscribite a nuestras novedades</h2>
          <p className="text-gray-500 mb-8">
            Recibí antes que nadie los nuevos productos, ofertas exclusivas y novedades de Electronic LP.
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 text-green-600 font-semibold"
            >
              <Check className="w-5 h-5" />
              ¡Gracias por suscribirte!
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
              <div className="flex-1">
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                  className="rounded-xl h-12 border-gray-200 focus-visible:ring-brand-blue-mid"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 text-left">{errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl px-6 h-12 bg-brand-blue-mid hover:bg-brand-blue-hover text-white"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suscribir"}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
