"use client";

import { motion } from "framer-motion";
import { Shield, Truck, CreditCard, Headphones, RefreshCcw, Star } from "lucide-react";

const BENEFITS = [
  {
    icon: Shield,
    title: "Garantía oficial",
    description: "Todos nuestros productos tienen garantía y respaldo.",
  },
  {
    icon: Truck,
    title: "Envío a todo el país",
    description: "Despachamos a domicilio en todo Argentina.",
  },
  {
    icon: CreditCard,
    title: "Pago seguro",
    description: "Pagá con Mercado Pago de forma segura y sencilla.",
  },
  {
    icon: Headphones,
    title: "Atención personalizada",
    description: "Respondemos todas tus consultas por WhatsApp e Instagram.",
  },
  {
    icon: RefreshCcw,
    title: "Cambios y devoluciones",
    description: "Si hay algún problema, lo resolvemos sin vueltas.",
  },
  {
    icon: Star,
    title: "Productos originales",
    description: "Trabajamos solo con productos 100% originales.",
  },
];

export function BenefitsSection() {
  return (
    <section className="section-padding bg-brand-blue-dark">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-brand-blue-light text-sm font-semibold tracking-widest uppercase mb-3">
            Por qué elegirnos
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Comprá con confianza
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-blue-mid/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand-blue-light" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{b.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{b.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
