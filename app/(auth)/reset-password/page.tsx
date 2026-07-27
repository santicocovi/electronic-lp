"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/actions/auth";
import { resetPasswordSchema, type ResetPasswordInput } from "@/validations";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(data: ResetPasswordInput) {
    if (!token) return;
    setError("");
    const result = await resetPassword(token, data.password);
    if (result.success) setDone(true);
    else setError(result.error);
  }

  if (!token) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
        <p className="text-gray-500 text-sm mb-8">
          Este link de recuperación no es válido. Pedí uno nuevo para continuar.
        </p>
        <Link href="/forgot-password">
          <Button className="rounded-xl w-full bg-brand-blue-mid hover:bg-brand-blue-hover">
            Pedir un link nuevo
          </Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Contraseña actualizada</h1>
        <p className="text-gray-500 text-sm mb-8">
          Ya podés ingresar con tu nueva contraseña.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="rounded-xl w-full bg-brand-blue-mid hover:bg-brand-blue-hover"
        >
          Iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva contraseña</h1>
      <p className="text-gray-500 text-sm mb-8">Elegí una contraseña segura para tu cuenta.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Nueva contraseña</Label>
          <div className="relative mt-1">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              className="rounded-xl h-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <Label>Repetir contraseña</Label>
          <Input
            {...register("confirmPassword")}
            type={showPassword ? "text" : "password"}
            className="mt-1 rounded-xl h-11"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    // useSearchParams needs a Suspense boundary during prerender.
    <Suspense fallback={<div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 h-64" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
