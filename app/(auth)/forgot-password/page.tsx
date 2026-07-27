"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/actions/auth";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/validations";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } =
    useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    setError("");
    const result = await requestPasswordReset(data.email);
    if (result.success) setSent(true);
    else setError(result.error);
  }

  if (sent) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-5">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisá tu email</h1>
        <p className="text-gray-500 text-sm mb-8">
          Si existe una cuenta con <span className="font-medium text-gray-700">{getValues("email")}</span>,
          te enviamos un link para restablecer tu contraseña. El link vence en 1 hora.
        </p>
        <Link href="/login">
          <Button variant="outline" className="rounded-xl w-full gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Recuperar contraseña</h1>
      <p className="text-gray-500 text-sm mb-8">
        Ingresá tu email y te mandamos un link para crear una nueva.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input {...register("email")} type="email" className="mt-1 rounded-xl h-11" placeholder="tu@email.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Enviar link de recuperación
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
      </Link>
    </div>
  );
}
