"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/validations";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
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
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
      <p className="text-gray-500 text-sm mb-8">¿No tenés cuenta? <Link href="/register" className="text-brand-blue-mid font-medium hover:underline">Registrate</Link></p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input {...register("email")} type="email" className="mt-1 rounded-xl h-11" placeholder="tu@email.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Contraseña</Label>
            <Link href="/forgot-password" className="text-xs text-brand-blue-mid hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <div className="relative">
            <Input {...register("password")} type={showPassword ? "text" : "password"} className="rounded-xl h-11 pr-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full rounded-xl h-11 bg-brand-blue-mid hover:bg-brand-blue-hover" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar"}
        </Button>
      </form>
    </div>
  );
}
