"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/validations";
import { registerUser } from "@/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setError("");
    const result = await registerUser(data);
    if (result.success) {
      router.push("/login?registered=true");
    } else {
      setError(result.error ?? "Error al registrarse");
    }
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
