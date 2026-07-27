"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactSchema, type ContactInput } from "@/validations";
import { toast } from "@/hooks/use-toast";

interface ContactFormProps {
  /** Datos del usuario logueado, para no pedirle lo que ya sabemos. */
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

export function ContactForm({ defaultName, defaultEmail, defaultPhone }: ContactFormProps) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: defaultName ?? "",
      email: defaultEmail ?? "",
      phone: defaultPhone ?? "",
    },
  });

  async function onSubmit(data: ContactInput) {
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (res.ok && payload?.success) {
        toast.add({ title: "Mensaje enviado", description: "Te respondemos a la brevedad." });
        setSent(true);
        reset({ name: defaultName ?? "", email: defaultEmail ?? "", phone: defaultPhone ?? "" });
        return;
      }

      // Se muestra el motivo real en lugar de un "Error al enviar" genérico.
      const message = payload?.error ?? "No pudimos enviar tu mensaje. Intentá más tarde.";
      setError(message);
      toast.add({ title: "No se pudo enviar", description: message, type: "error" });
    } catch {
      const message = "Se cortó la conexión. Revisá tu internet e intentá de nuevo.";
      setError(message);
      toast.add({ title: "Sin conexión", description: message, type: "error" });
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <CheckCircle2 className="w-11 h-11 text-emerald-500 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Mensaje enviado</h2>
        <p className="text-sm text-gray-500 mb-6">
          Recibimos tu consulta y te vamos a responder por email a la brevedad.
        </p>
        <Button variant="outline" className="rounded-xl" onClick={() => setSent(false)}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Envianos un mensaje</h2>

      {error && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Honeypot: invisible para las personas, tentador para los bots. */}
        <input
          type="text"
          {...register("website" as never)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute w-0 h-0 opacity-0 pointer-events-none -z-10"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contact-name">Nombre *</Label>
            <Input id="contact-name" {...register("name")} className="mt-1 rounded-xl" autoComplete="name" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="contact-email">Email *</Label>
            <Input id="contact-email" {...register("email")} type="email" className="mt-1 rounded-xl" autoComplete="email" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="contact-phone">Teléfono (opcional)</Label>
          <Input id="contact-phone" {...register("phone")} className="mt-1 rounded-xl" autoComplete="tel" />
        </div>

        <div>
          <Label htmlFor="contact-subject">Asunto *</Label>
          <Input id="contact-subject" {...register("subject")} className="mt-1 rounded-xl" />
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
        </div>

        <div>
          <Label htmlFor="contact-message">Mensaje *</Label>
          <Textarea id="contact-message" {...register("message")} className="mt-1 rounded-xl" rows={5} />
          {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <><Send className="w-4 h-4" aria-hidden="true" /> Enviar mensaje</>
          )}
        </Button>
      </form>
    </div>
  );
}
