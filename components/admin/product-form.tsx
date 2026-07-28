"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Save, Upload, Star, X, Plus, Trash2, GripVertical,
  Calculator, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/validations";
import { createProduct, updateProduct } from "@/actions/admin/products";
import type { ProductImageType, ProductVariantType, ProductSpecType } from "@/types";

interface ProductFormProps {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  /** Moneda en la que están cargados los precios del catálogo. */
  baseCurrency: "USD" | "ARS";
  /** Pesos por dólar, para sugerir el precio en pesos. */
  exchangeRate: number;
  initialData?: {
    id: string;
    images: ProductImageType[];
    variants: ProductVariantType[];
    specs: ProductSpecType[];
  } & Partial<ProductInput>;
}

type ImageItem = { url: string; alt: string; isMain: boolean };
/** `id` viaja de ida y vuelta para que al editar se actualice la variante
 *  existente en lugar de borrarla y recrearla (lo que rompía los pedidos
 *  históricos que la referencian). */
type VariantItem = {
  id?: string;
  name: string;
  value: string;
  type: string;
  price: string;
  stock: string;
  sku: string;
};
type SpecItem = { group: string; label: string; value: string };

const VARIANT_TYPES = ["color", "storage", "memory", "size"];

export function ProductForm({
  categories,
  brands,
  baseCurrency,
  exchangeRate,
  initialData,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryItems = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );
  const brandItems = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.name])),
    [brands]
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>(
    initialData?.images.map((img) => ({ url: img.url, alt: img.alt ?? "", isMain: img.isMain })) ?? []
  );
  const [variants, setVariants] = useState<VariantItem[]>(
    initialData?.variants.map((v) => ({
      id: v.id,
      name: v.name, value: v.value, type: v.type,
      price: v.price?.toString() ?? "", stock: v.stock.toString(), sku: v.sku ?? "",
    })) ?? []
  );
  const [specs, setSpecs] = useState<SpecItem[]>(
    initialData?.specs.map((s) => ({ group: s.group, label: s.label, value: s.value })) ?? []
  );

  const {
    register, handleSubmit, control, watch, setValue, formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      slug: initialData?.slug ?? "",
      shortDescription: initialData?.shortDescription ?? "",
      description: initialData?.description ?? "",
      sku: initialData?.sku ?? "",
      price: initialData?.price ?? undefined,
      comparePrice: initialData?.comparePrice ?? undefined,
      costPrice: initialData?.costPrice ?? undefined,
      priceArs: initialData?.priceArs ?? undefined,
      comparePriceArs: initialData?.comparePriceArs ?? undefined,
      stock: initialData?.stock ?? 0,
      lowStockAlert: initialData?.lowStockAlert ?? 5,
      warranty: initialData?.warranty ?? "",
      isActive: initialData?.isActive ?? true,
      isFeatured: initialData?.isFeatured ?? false,
      isNew: initialData?.isNew ?? false,
      isOnSale: initialData?.isOnSale ?? false,
      freeShipping: initialData?.freeShipping ?? false,
      categoryId: initialData?.categoryId ?? undefined,
      brandId: initialData?.brandId ?? undefined,
      metaTitle: initialData?.metaTitle ?? "",
      metaDesc: initialData?.metaDesc ?? "",
    },
  });

  const nameValue = watch("name");
  const priceValue = Number(watch("price")) || 0;
  const comparePriceValue = Number(watch("comparePrice")) || 0;
  const priceArsValue = Number(watch("priceArs")) || 0;

  const baseCurrencyLabel =
    baseCurrency === "ARS" ? "pesos argentinos (ARS)" : "dólares (USD)";

  /** Conversión sugerida, redondeada a la unidad: nadie cobra centavos de peso. */
  const convertToArs = (value: number) =>
    value > 0 && exchangeRate > 0 ? String(Math.round(value * exchangeRate)) : "";

  const suggestedPriceArs = convertToArs(priceValue);
  const suggestedComparePriceArs = convertToArs(comparePriceValue);

  /**
   * Avisa si el precio en pesos cargado a mano se despegó demasiado de la
   * conversión. No bloquea —puede ser intencional— pero evita el error de tipeo
   * que deja un producto a la décima parte de su valor.
   */
  const priceMismatchWarning = (() => {
    if (!priceArsValue || !suggestedPriceArs) return null;
    const suggested = Number(suggestedPriceArs);
    const deviation = Math.abs(priceArsValue - suggested) / suggested;
    if (deviation < 0.25) return null;

    return `El precio en pesos cargado ($${priceArsValue.toLocaleString("es-AR")}) se aparta un ${Math.round(
      deviation * 100
    )}% de la conversión automática ($${suggested.toLocaleString("es-AR")}). Revisá que sea correcto.`;
  })();

  /** Completa los precios en pesos con la cotización vigente. */
  function fillArsFromRate() {
    if (suggestedPriceArs) setValue("priceArs", Number(suggestedPriceArs));
    if (suggestedComparePriceArs) setValue("comparePriceArs", Number(suggestedComparePriceArs));
  }

  function handleGenerateSlug() {
    if (nameValue) setValue("slug", slugify(nameValue));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (res.ok) {
          setImages((prev) => [...prev, { url: json.url, alt: "", isMain: prev.length === 0 }]);
        } else {
          toast.add({ title: json.error ?? "Error al subir imagen", type: "error" });
        }
      } catch {
        toast.add({ title: "Error al subir imagen", type: "error" });
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (prev[idx]?.isMain && next.length > 0 && !next.some((i) => i.isMain)) {
        next[0] = { ...next[0], isMain: true };
      }
      return next;
    });
  }

  function setMainImage(idx: number) {
    setImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === idx })));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { name: "", value: "", type: "color", price: "", stock: "0", sku: "" }]);
  }

  function updateVariant(idx: number, field: keyof VariantItem, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSpec() {
    setSpecs((prev) => [...prev, { group: "General", label: "", value: "" }]);
  }

  function updateSpec(idx: number, field: keyof SpecItem, value: string) {
    setSpecs((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function removeSpec(idx: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(data: ProductInput) {
    setSaving(true);

    const imagesPayload = images.map((img, i) => ({
      url: img.url, alt: img.alt || data.name, isMain: img.isMain, order: i,
    }));
    const variantsPayload = variants
      .filter((v) => v.name.trim() && v.value.trim())
      .map((v, i) => ({
        id: v.id,
        name: v.name, value: v.value, type: v.type,
        price: v.price ? Number(v.price) : undefined,
        stock: Number(v.stock) || 0,
        sku: v.sku || undefined,
        order: i,
      }));
    const specsPayload = specs
      .filter((s) => s.label.trim() && s.value.trim())
      .map((s, i) => ({ group: s.group || "General", label: s.label, value: s.value, order: i }));

    const result = isEdit
      ? await updateProduct(initialData!.id, data, imagesPayload, variantsPayload, specsPayload)
      : await createProduct(data, imagesPayload, variantsPayload, specsPayload);

    if (result.success) {
      toast.add({ title: isEdit ? "Producto actualizado" : "Producto creado" });
      router.push("/admin/products");
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Información básica</h2>

        <div>
          <Label>Nombre del producto</Label>
          <Input {...register("name")} className="mt-1 rounded-xl" placeholder="iPhone 15 Pro Max 256GB" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label>Slug (URL)</Label>
          <div className="flex gap-2 mt-1">
            <Input {...register("slug")} className="rounded-xl" placeholder="iphone-15-pro-max-256gb" />
            <Button type="button" variant="outline" className="rounded-xl flex-shrink-0" onClick={handleGenerateSlug}>
              Generar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Categoría</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange} items={categoryItems}>
                  <SelectTrigger className="mt-1 w-full rounded-xl">
                    <SelectValue placeholder="Elegir categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Marca</Label>
            <Controller
              control={control}
              name="brandId"
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange} items={brandItems}>
                  <SelectTrigger className="mt-1 w-full rounded-xl">
                    <SelectValue placeholder="Elegir marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div>
          <Label>SKU</Label>
          <Input {...register("sku")} className="mt-1 rounded-xl" placeholder="Opcional" />
        </div>

        <div>
          <Label>Descripción corta</Label>
          <Textarea {...register("shortDescription")} className="mt-1 rounded-xl" rows={2} />
        </div>

        <div>
          <Label>Descripción completa</Label>
          <Textarea {...register("description")} className="mt-1 rounded-xl" rows={5} />
        </div>
      </div>

      {/* Pricing & inventory */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Precio e inventario</h2>
          <p className="text-sm text-gray-500 mt-1">
            Los precios de esta primera fila están en <strong>{baseCurrencyLabel}</strong>, la moneda
            base de la tienda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Precio ({baseCurrency})</Label>
            <Input {...register("price")} type="number" step="0.01" min="0" className="mt-1 rounded-xl" />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price.message}</p>}
          </div>
          <div>
            <Label>Precio de lista tachado ({baseCurrency})</Label>
            <Input {...register("comparePrice")} type="number" step="0.01" min="0" className="mt-1 rounded-xl" placeholder="Opcional" />
          </div>
          <div>
            <Label>Precio de costo ({baseCurrency})</Label>
            <Input {...register("costPrice")} type="number" step="0.01" min="0" className="mt-1 rounded-xl" placeholder="Opcional" />
          </div>
        </div>

        {/* Precios en pesos administrados a mano */}
        {baseCurrency !== "ARS" && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">Precio en pesos</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xl">
                  Si lo dejás vacío, el precio en pesos se calcula solo con la cotización del día
                  (1 USD = ${exchangeRate.toLocaleString("es-AR")}). Cargalo únicamente cuando quieras
                  fijar un valor comercial y que no se mueva con el dólar.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-2 flex-shrink-0"
                onClick={fillArsFromRate}
              >
                <Calculator className="w-3.5 h-3.5" aria-hidden="true" />
                Calcular con la cotización
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Precio en pesos (ARS)</Label>
                <Input
                  {...register("priceArs")}
                  type="number"
                  step="1"
                  min="0"
                  className="mt-1 rounded-xl"
                  placeholder={priceValue ? suggestedPriceArs : "Automático"}
                />
                {suggestedPriceArs && (
                  <p className="text-xs text-gray-400 mt-1">
                    Conversión automática: ${suggestedPriceArs}
                  </p>
                )}
              </div>
              <div>
                <Label>Precio de lista tachado en pesos (ARS)</Label>
                <Input
                  {...register("comparePriceArs")}
                  type="number"
                  step="1"
                  min="0"
                  className="mt-1 rounded-xl"
                  placeholder={comparePriceValue ? suggestedComparePriceArs : "Automático"}
                />
              </div>
            </div>

            {priceMismatchWarning && (
              <p className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                {priceMismatchWarning}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Stock</Label>
            <Input {...register("stock")} type="number" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label>Alerta de stock bajo</Label>
            <Input {...register("lowStockAlert")} type="number" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label>Garantía</Label>
            <Input {...register("warranty")} className="mt-1 rounded-xl" placeholder="Ej: 12 meses" />
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Visibilidad y etiquetas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ["isActive", "Producto activo (visible en la tienda)"],
            ["isFeatured", "Destacado (aparece en el carrusel de la portada)"],
            ["isNew", "Marcar como nuevo"],
            ["isOnSale", "Marcar como oferta"],
            ["freeShipping", "Envío gratis"],
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

      {/* Images */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Imágenes</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Subir imágenes
            </Button>
          </div>
        </div>

        {images.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no subiste ninguna imagen.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div key={img.url + idx} className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square">
                <img src={img.url} alt={img.alt} className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    title="Marcar como principal"
                    onClick={() => setMainImage(idx)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${img.isMain ? "bg-amber-400 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    <Star className="w-4 h-4" fill={img.isMain ? "currentColor" : "none"} />
                  </button>
                  <button
                    type="button"
                    title="Quitar"
                    onClick={() => removeImage(idx)}
                    className="w-8 h-8 rounded-lg bg-white text-red-500 hover:bg-red-50 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {img.isMain && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold bg-amber-400 text-white px-1.5 py-0.5 rounded-md">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Variants */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Variantes</h2>
          <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={addVariant}>
            <Plus className="w-4 h-4" /> Agregar variante
          </Button>
        </div>

        {variants.length === 0 ? (
          <p className="text-sm text-gray-400">Sin variantes (ej: color, capacidad).</p>
        ) : (
          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end p-3 rounded-xl bg-gray-50">
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">Tipo</Label>
                  <select
                    value={v.type}
                    onChange={(e) => updateVariant(idx, "type", e.target.value)}
                    className="mt-1 w-full h-9 rounded-lg border border-gray-200 text-sm px-2"
                  >
                    {VARIANT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input value={v.name} onChange={(e) => updateVariant(idx, "name", e.target.value)} className="mt-1 rounded-lg h-9" placeholder="Color" />
                </div>
                <div>
                  <Label className="text-xs">Valor</Label>
                  <Input value={v.value} onChange={(e) => updateVariant(idx, "value", e.target.value)} className="mt-1 rounded-lg h-9" placeholder="Azul" />
                </div>
                <div>
                  {/* Precio final de la variante, no un adicional: si se deja
                      vacío, la variante hereda el precio del producto. */}
                  <Label className="text-xs">Precio propio</Label>
                  <Input type="number" step="0.01" min="0" value={v.price} onChange={(e) => updateVariant(idx, "price", e.target.value)} className="mt-1 rounded-lg h-9" placeholder="Hereda" />
                </div>
                <div>
                  <Label className="text-xs">Stock</Label>
                  <Input type="number" value={v.stock} onChange={(e) => updateVariant(idx, "stock", e.target.value)} className="mt-1 rounded-lg h-9" />
                </div>
                <button type="button" onClick={() => removeVariant(idx)} className="h-9 w-9 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 justify-self-end">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Specs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Especificaciones técnicas</h2>
          <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={addSpec}>
            <Plus className="w-4 h-4" /> Agregar especificación
          </Button>
        </div>

        {specs.length === 0 ? (
          <p className="text-sm text-gray-400">Sin especificaciones (ej: Pantalla, Procesador).</p>
        ) : (
          <div className="space-y-3">
            {specs.map((s, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-7 gap-2 items-end p-3 rounded-xl bg-gray-50">
                <GripVertical className="hidden sm:block w-4 h-4 text-gray-300 mb-2" />
                <div className="col-span-2 sm:col-span-2">
                  <Label className="text-xs">Grupo</Label>
                  <Input value={s.group} onChange={(e) => updateSpec(idx, "group", e.target.value)} className="mt-1 rounded-lg h-9" placeholder="General" />
                </div>
                <div className="col-span-2 sm:col-span-2">
                  <Label className="text-xs">Etiqueta</Label>
                  <Input value={s.label} onChange={(e) => updateSpec(idx, "label", e.target.value)} className="mt-1 rounded-lg h-9" placeholder="Pantalla" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label className="text-xs">Valor</Label>
                  <Input value={s.value} onChange={(e) => updateSpec(idx, "value", e.target.value)} className="mt-1 rounded-lg h-9" placeholder="6.7'' OLED" />
                </div>
                <button type="button" onClick={() => removeSpec(idx)} className="h-9 w-9 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 justify-self-end">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEO */}
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
        <Button type="submit" className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2" disabled={saving || uploading}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push("/admin/products")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
