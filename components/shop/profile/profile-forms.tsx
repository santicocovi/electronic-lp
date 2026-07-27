"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { updateProfile, changePassword } from "@/actions/profile";
import {
  profileSchema, changePasswordSchema,
  type ProfileInput, type ChangePasswordInput,
} from "@/validations";

export function ProfileDetailsForm({
  defaultValues,
  email,
}: {
  defaultValues: ProfileInput;
  email: string;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  async function onSubmit(data: ProfileInput) {
    setSaving(true);
    const result = await updateProfile(data);
    if (result.success) {
      toast.add({ title: "Datos actualizados" });
      // Keep the name shown in the navbar in sync.
      await update({ name: data.name });
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Datos personales</h2>

      <div>
        <Label>Nombre completo</Label>
        <Input {...register("name")} className="mt-1 rounded-xl" />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <Label>Email</Label>
        <Input value={email} disabled className="mt-1 rounded-xl bg-gray-50" />
        <p className="text-xs text-gray-400 mt-1">El email no se puede modificar.</p>
      </div>

      <div>
        <Label>Teléfono</Label>
        <Input {...register("phone")} className="mt-1 rounded-xl" placeholder="221 435-8517" />
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar cambios
      </Button>
    </form>
  );
}

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(data: ChangePasswordInput) {
    setSaving(true);
    const result = await changePassword(data);
    if (result.success) {
      toast.add({ title: "Contraseña actualizada" });
      reset();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  if (!hasPassword) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Contraseña</h2>
        <p className="text-sm text-gray-500">
          Tu cuenta ingresa con Google, así que no tiene una contraseña para cambiar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>

      <div>
        <Label>Contraseña actual</Label>
        <Input {...register("currentPassword")} type="password" className="mt-1 rounded-xl" />
        {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nueva contraseña</Label>
          <Input {...register("password")} type="password" className="mt-1 rounded-xl" />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <Label>Repetir nueva contraseña</Label>
          <Input {...register("confirmPassword")} type="password" className="mt-1 rounded-xl" />
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <Button
        type="submit"
        variant="outline"
        disabled={saving}
        className="rounded-xl gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Cambiar contraseña
      </Button>
    </form>
  );
}
