"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FAQ } from "@prisma/client";

const DEFAULT_FAQS = [
  {
    id: "1",
    question: "¿Los productos tienen garantía?",
    answer: "Sí, todos nuestros productos son 100% originales y cuentan con garantía oficial de fábrica.",
  },
  {
    id: "2",
    question: "¿Hacen envíos a todo el país?",
    answer: "Sí, enviamos a todo Argentina. El tiempo de entrega varía según la localidad.",
  },
  {
    id: "3",
    question: "¿Cómo puedo pagar?",
    answer: "Aceptamos pagos con tarjeta de crédito, débito, transferencia bancaria y efectivo a través de Mercado Pago.",
  },
  {
    id: "4",
    question: "¿Puedo hacer una consulta antes de comprar?",
    answer: "¡Por supuesto! Podés escribirnos por WhatsApp o Instagram y te respondemos a la brevedad.",
  },
  {
    id: "5",
    question: "¿Qué pasa si el producto llega dañado?",
    answer: "En caso de recibir un producto con algún problema, escribinos de inmediato y lo solucionamos sin costo.",
  },
];

interface FAQSectionProps {
  faqs?: FAQ[];
}

export function FAQSection({ faqs }: FAQSectionProps) {
  const items = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  return (
    <section id="faq" className="section-padding">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-brand-blue-mid text-sm font-semibold tracking-widest uppercase mb-3">
            FAQ
          </p>
          <h2 className="heading-lg text-gray-900">Preguntas frecuentes</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion className="space-y-3">
            {items.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="bg-white border border-gray-100 rounded-2xl px-6 shadow-sm data-[state=open]:border-brand-blue-border"
              >
                <AccordionTrigger className="text-left font-semibold text-gray-900 hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
