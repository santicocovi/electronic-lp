"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/validations";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  // El link del email de verificación vuelve acá con ?verified=1.
  const justVerified = searchParams.get("verified") === "1";

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError("");

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }

    // Si la cuenta todavía no confirmó el email, se lleva al usuario derecho a
    // la pantalla de verificación en vez de dejarlo chocar recién en el
    // checkout. La restricción real igual se valida en el servidor.
    const session = await getSession();
    const verified = (session?.user as { isEmailVerified?: boolean } | undefined)?.isEmailVerified;

    router.push(verified === false ? "/verify-email" : callbackUrl);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
      <p className="text-gray-500 text-sm mb-8">¿No tenés cuenta? <Link href="/register" className="text-brand-blue-mid font-medium hover:underline">Registrate</Link></p>

      {justVerified && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm" role="status">
          Tu email quedó verificado. Ingresá para continuar.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm" role="alert">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" {...register("email")} type="email" className="mt-1 rounded-xl h-11" placeholder="tu@email.com" autoComplete="email" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="login-password">Contraseña</Label>
            <Link href="/forgot-password" className="text-xs text-brand-blue-mid hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <div className="relative">
            <Input id="login-password" {...register("password")} type={showPassword ? "text" : "password"} className="rounded-xl h-11 pr-11" autoComplete="current-password" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <MailWarning className="w-3.5 h-3.5" aria-hidden="true" />
        Para comprar necesitás tener el email confirmado.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    // useSearchParams necesita un límite de Suspense: sin él, el prerender de
    // esta ruta falla al compilar.
    <Suspense fallback={<div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 h-96" />}>
      <LoginForm />
    </Suspense>
  );
}
