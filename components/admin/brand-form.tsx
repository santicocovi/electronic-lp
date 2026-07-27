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
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";
import { brandSchema, type BrandInput } from "@/validations";
import { createBrand, updateBrand } from "@/actions/admin/brands";

interface BrandFormProps {
  initialData?: { id: string } & Partial<BrandInput>;
}

export function BrandForm({ initialData }: BrandFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [saving, setSaving] = useState(false);

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors },
  } = useForm<BrandInput>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      logo: initialData?.logo ?? "",
      description: initialData?.description ?? "",
      website: initialData?.website ?? "",
      order: initialData?.order ?? 0,
      isActive: initialData?.isActive ?? true,
    },
  });

  const nameValue = watch("name");

  async function onSubmit(data: BrandInput) {
    setSaving(true);
    const result = isEdit
      ? await updateBrand(initialData!.id, data)
      : await createBrand(data);

    if (result.success) {
      toast.add({ title: isEdit ? "Marca actualizada" : "Marca creada" });
      router.push("/admin/brands");
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Información de la marca</h2>

        <div>
          <Label>Nombre</Label>
          <Input {...register("name")} className="mt-1 rounded-xl" placeholder="Apple" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label>Slug (URL)</Label>
          <div className="flex gap-2 mt-1">
            <Input {...register("slug")} className="rounded-xl" placeholder="apple" />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-shrink-0"
              onClick={() => nameValue && setValue("slug", slugify(nameValue))}
            >
              Generar
            </Button>
          </div>
        </div>

        <div>
          <Label>Descripción</Label>
          <Textarea {...register("description")} className="mt-1 rounded-xl" rows={3} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Sitio web</Label>
            <Input {...register("website")} className="mt-1 rounded-xl" placeholder="https://apple.com" />
            {errors.website && <p className="text-xs text-red-500 mt-1">Ingresá una URL válida (con https://)</p>}
          </div>
          <div>
            <Label>Orden</Label>
            <Input {...register("order")} type="number" className="mt-1 rounded-xl" />
          </div>
        </div>

        <div>
          <Label>Logo</Label>
          <Controller
            control={control}
            name="logo"
            render={({ field }) => (
              <ImageUploadField value={field.value ?? ""} onChange={field.onChange} label="Subir logo" />
            )}
          />
        </div>

        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
          <Label className="cursor-pointer">Marca activa (visible en la tienda)</Label>
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
          {isEdit ? "Guardar cambios" : "Crear marca"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push("/admin/brands")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
