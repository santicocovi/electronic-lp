"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send, MessageCircle, Instagram, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/validations";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const CONTACT_INFO = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+54 9 221 435-8517",
    href: "https://wa.me/5492214358517",
    color: "text-green-600 bg-green-50",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@electronic.lp",
    href: "https://instagram.com/electronic.lp",
    color: "text-pink-600 bg-pink-50",
  },
  {
    icon: Mail,
    label: "Email",
    value: "electroniclpok@gmail.com",
    href: "mailto:electroniclpok@gmail.com",
    color: "text-brand-blue-mid bg-brand-blue-subtle",
  },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactInput) {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      toast.add({ title: "Mensaje enviado", description: "Te respondemos a la brevedad." });
      setSent(true);
      reset();
    } else {
      toast.add({ title: "Error al enviar", type: "error" });
    }
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Contacto</h1>
          <p className="text-gray-500 max-w-md mx-auto">Estamos para ayudarte. Escribinos y te respondemos lo antes posible.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Medios de contacto</h2>
            <div className="space-y-4">
              {CONTACT_INFO.map((c) => {
                const Icon = c.icon;
                return (
                  <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{c.label}</p>
                      <p className="font-semibold text-gray-900">{c.value}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Envianos un mensaje</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input {...register("name")} className="mt-1 rounded-xl" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input {...register("email")} type="email" className="mt-1 rounded-xl" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>
              <div>
                <Label>Teléfono (opcional)</Label>
                <Input {...register("phone")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Asunto *</Label>
                <Input {...register("subject")} className="mt-1 rounded-xl" />
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <Label>Mensaje *</Label>
                <Textarea {...register("message")} className="mt-1 rounded-xl" rows={4} />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover gap-2" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar mensaje</>}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
