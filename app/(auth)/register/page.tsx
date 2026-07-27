"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, MailCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/validations";
import { registerUser } from "@/actions/auth";
import { ResendVerification } from "@/components/shop/auth/resend-verification";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  // Al registrarse no se redirige al login: primero hay que confirmar el email.
  const [registered, setRegistered] = useState<{ email: string; emailSent: boolean } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setError("");
    const result = await registerUser(data);
    if (result.success) {
      setRegistered({ email: data.email, emailSent: result.data?.emailSent ?? false });
    } else {
      setError(result.error ?? "Error al registrarse");
    }
  }

  if (registered) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <MailCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisá tu email</h1>

        {registered.emailSent ? (
          <p className="text-gray-500 text-sm mb-6">
            Enviamos un link de confirmación a{" "}
            <strong className="text-gray-900">{registered.email}</strong>. Hacé clic en el link para
            activar tu cuenta. Si no lo ves, revisá la carpeta de spam.
          </p>
        ) : (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
            <p className="text-amber-800 text-sm flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Tu cuenta se creó, pero no pudimos enviar el email de confirmación en este momento.
                Probá reenviarlo en unos minutos.
              </span>
            </p>
          </div>
        )}

        <ResendVerification defaultEmail={registered.email} hideInput />

        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-brand-blue-mid font-medium hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
      <p className="text-gray-500 text-sm mb-8">¿Ya tenés cuenta? <Link href="/login" className="text-brand-blue-mid font-medium hover:underline">Iniciá sesión</Link></p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Nombre completo</Label>
          <Input {...register("name")} className="mt-1 rounded-xl h-11" placeholder="Tu nombre" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label>Email</Label>
          <Input {...register("email")} type="email" className="mt-1 rounded-xl h-11" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label>Contraseña</Label>
          <div className="relative">
            <Input {...register("password")} type={showPassword ? "text" : "password"} className="mt-1 rounded-xl h-11 pr-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 mt-0.5">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <Label>Confirmar contraseña</Label>
          <Input {...register("confirmPassword")} type="password" className="mt-1 rounded-xl h-11" />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta"}
        </Button>
      </form>
    </div>
  );
}
