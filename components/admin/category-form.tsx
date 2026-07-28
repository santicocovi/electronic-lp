"use client";

import { useMemo, useState } from "react";
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
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";
import { categorySchema, type CategoryInput } from "@/validations";
import { createCategory, updateCategory } from "@/actions/admin/categories";

const NO_PARENT = "__none__";

interface CategoryFormProps {
  /** Possible parents, already excluding the category being edited. */
  parents: { id: string; name: string }[];
  initialData?: { id: string } & Partial<CategoryInput>;
}

export function CategoryForm({ parents, initialData }: CategoryFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const [saving, setSaving] = useState(false);

  const parentItems = useMemo(
    () => ({
      [NO_PARENT]: "Sin categoría padre",
      ...Object.fromEntries(parents.map((p) => [p.id, p.name])),
    }),
    [parents]
  );

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      description: initialData?.description ?? "",
      image: initialData?.image ?? "",
      parentId: initialData?.parentId ?? "",
      order: initialData?.order ?? 0,
      isActive: initialData?.isActive ?? true,
      showInNav: initialData?.showInNav ?? true,
      metaTitle: initialData?.metaTitle ?? "",
      metaDesc: initialData?.metaDesc ?? "",
    },
  });

  const nameValue = watch("name");

  async function onSubmit(data: CategoryInput) {
    setSaving(true);
    const result = isEdit
      ? await updateCategory(initialData!.id, data)
      : await createCategory(data);

    if (result.success) {
      toast.add({ title: isEdit ? "Categoría actualizada" : "Categoría creada" });
      router.push("/admin/categories");
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Información básica</h2>

        <div>
          <Label>Nombre</Label>
          <Input {...register("name")} className="mt-1 rounded-xl" placeholder="iPhone" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label>Slug (URL)</Label>
          <div className="flex gap-2 mt-1">
            <Input {...register("slug")} className="rounded-xl" placeholder="iphone" />
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
            <Label>Categoría padre</Label>
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <Select
                  items={parentItems}
                  value={field.value || NO_PARENT}
                  onValueChange={(v) => field.onChange(v === NO_PARENT ? "" : v)}
                >
                  <SelectTrigger className="mt-1 w-full rounded-xl">
                    <SelectValue placeholder="Sin categoría padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>Sin categoría padre</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Orden</Label>
            <Input {...register("order")} type="number" className="mt-1 rounded-xl" />
          </div>
        </div>

        <div>
          <Label>Imagen</Label>
          <Controller
            control={control}
            name="image"
            render={({ field }) => (
              <ImageUploadField value={field.value ?? ""} onChange={field.onChange} />
            )}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Visibilidad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ["isActive", "Categoría activa (visible en la tienda)"],
            ["showInNav", "Mostrar en el menú de navegación"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
              <Label className="cursor-pointer">{label}</Label>
              <Controller
                control={control}
                name={key}
                render={({ field }) => (
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">SEO</h2>
        <div>
          <Label>Meta título</Label>
          <Input {...register("metaTitle")} className="mt-1 rounded-xl" />
        </div>
        <div>
          <Label>Meta descripción</Label>
          <Textarea {...register("metaDesc")} className="mt-1 rounded-xl" rows={2} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? "Guardar cambios" : "Crear categoría"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push("/admin/categories")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
