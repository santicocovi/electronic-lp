"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { couponSchema, type CouponInput } from "@/validations";
import { createCoupon, updateCoupon } from "@/actions/admin/coupons";

const TYPE_ITEMS = {
  PERCENTAGE: "Porcentaje (%)",
  FIXED: "Monto fijo ($)",
};

interface CouponFormProps {
  initialData?: { id: string } & Partial<CouponInput>;
}

export function CouponForm({ initialData }: CouponFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [saving, setSaving] = useState(false);

  const {
    register, handleSubmit, control, watch, formState: { errors },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      description: initialData?.description ?? "",
      type: initialData?.type ?? "PERCENTAGE",
      value: initialData?.value ?? undefined,
      minOrderAmount: initialData?.minOrderAmount ?? undefined,
      maxDiscount: initialData?.maxDiscount ?? undefined,
      usageLimit: initialData?.usageLimit ?? undefined,
      perUserLimit: initialData?.perUserLimit ?? undefined,
      isActive: initialData?.isActive ?? true,
      startsAt: initialData?.startsAt ?? "",
      expiresAt: initialData?.expiresAt ?? "",
    },
  });

  const type = watch("type");

  async function onSubmit(data: CouponInput) {
    setSaving(true);
    const result = isEdit
      ? await updateCoupon(initialData!.id, data)
      : await createCoupon(data);

    if (result.success) {
      toast.add({ title: isEdit ? "Cupón actualizado" : "Cupón creado" });
      router.push("/admin/promotions/coupons");
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Cupón</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Código</Label>
            <Input
              {...register("code")}
              className="mt-1 rounded-xl uppercase"
              placeholder="BIENVENIDO10"
            />
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
          </div>
          <div>
            <Label>Tipo de descuento</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select items={TYPE_ITEMS} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Porcentaje (%)</SelectItem>
                    <SelectItem value="FIXED">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div>
          <Label>Descripción</Label>
          <Textarea {...register("description")} className="mt-1 rounded-xl" rows={2} placeholder="Opcional, para uso interno" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>{type === "PERCENTAGE" ? "Porcentaje" : "Monto"} de descuento</Label>
            <Input {...register("value")} type="number" step="0.01" className="mt-1 rounded-xl" />
            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value.message}</p>}
          </div>
          <div>
            <Label>Compra mínima</Label>
            <Input {...register("minOrderAmount")} type="number" step="0.01" className="mt-1 rounded-xl" placeholder="Sin mínimo" />
          </div>
          <div>
            <Label>Descuento máximo</Label>
            <Input {...register("maxDiscount")} type="number" step="0.01" className="mt-1 rounded-xl" placeholder="Sin tope" />
            {type === "PERCENTAGE" && (
              <p className="text-xs text-gray-400 mt-1">Útil para topear un % alto</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Límites y vigencia</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Usos totales</Label>
            <Input {...register("usageLimit")} type="number" className="mt-1 rounded-xl" placeholder="Ilimitado" />
          </div>
          <div>
            <Label>Usos por cliente</Label>
            <Input {...register("perUserLimit")} type="number" className="mt-1 rounded-xl" placeholder="Ilimitado" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Válido desde</Label>
            <Input {...register("startsAt")} type="date" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label>Válido hasta</Label>
            <Input {...register("expiresAt")} type="date" className="mt-1 rounded-xl" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
          <Label className="cursor-pointer">Cupón activo</Label>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? "Guardar cambios" : "Crear cupón"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push("/admin/promotions/coupons")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
