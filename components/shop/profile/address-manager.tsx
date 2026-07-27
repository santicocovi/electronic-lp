"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, Trash2, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { createAddress, updateAddress, deleteAddress } from "@/actions/profile";
import { addressSchema, type AddressInput } from "@/validations";
import type { AddressType } from "@/types";

const EMPTY: AddressInput = {
  label: "Casa", firstName: "", lastName: "", street: "", number: "",
  apartment: "", city: "", province: "Buenos Aires", postalCode: "",
  phone: "", isDefault: false,
};

export function AddressManager({ addresses }: { addresses: AddressType[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AddressType | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formOpen = creating || !!editing;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<AddressInput>({ resolver: zodResolver(addressSchema), defaultValues: EMPTY });

  const isDefault = watch("isDefault");

  function openCreate() {
    reset(EMPTY);
    setEditing(null);
    setCreating(true);
  }

  function openEdit(address: AddressType) {
    reset({
      label: address.label,
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      number: address.number,
      apartment: address.apartment ?? "",
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      phone: address.phone ?? "",
      isDefault: address.isDefault,
    });
    setCreating(false);
    setEditing(address);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function onSubmit(data: AddressInput) {
    setSaving(true);
    const result = editing
      ? await updateAddress(editing.id, data)
      : await createAddress(data);

    if (result.success) {
      toast.add({ title: editing ? "Dirección actualizada" : "Dirección guardada" });
      closeForm();
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setSaving(false);
  }

  async function handleDelete(address: AddressType) {
    if (!confirm(`¿Eliminar la dirección "${address.label}"?`)) return;
    setDeletingId(address.id);
    const result = await deleteAddress(address.id);
    if (result.success) {
      toast.add({ title: "Dirección eliminada" });
      router.refresh();
    } else {
      toast.add({ title: result.error, type: "error" });
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <Button onClick={openCreate} className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
          <Plus className="w-4 h-4" /> Agregar dirección
        </Button>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editing ? "Editar dirección" : "Nueva dirección"}
          </h2>

          <div>
            <Label>Nombre de la dirección</Label>
            <Input {...register("label")} className="mt-1 rounded-xl" placeholder="Casa, Trabajo..." />
            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input {...register("firstName")} className="mt-1 rounded-xl" />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label>Apellido</Label>
              <Input {...register("lastName")} className="mt-1 rounded-xl" />
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-4">
            <div>
              <Label>Calle</Label>
              <Input {...register("street")} className="mt-1 rounded-xl" />
              {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street.message}</p>}
            </div>
            <div>
              <Label>Número</Label>
              <Input {...register("number")} className="mt-1 rounded-xl" />
              {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number.message}</p>}
            </div>
            <div>
              <Label>Depto.</Label>
              <Input {...register("apartment")} className="mt-1 rounded-xl" placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Ciudad</Label>
              <Input {...register("city")} className="mt-1 rounded-xl" />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
            </div>
            <div>
              <Label>Provincia</Label>
              <Input {...register("province")} className="mt-1 rounded-xl" />
              {errors.province && <p className="text-xs text-red-500 mt-1">{errors.province.message}</p>}
            </div>
            <div>
              <Label>Código postal</Label>
              <Input {...register("postalCode")} className="mt-1 rounded-xl" />
              {errors.postalCode && <p className="text-xs text-red-500 mt-1">{errors.postalCode.message}</p>}
            </div>
          </div>

          <div>
            <Label>Teléfono</Label>
            <Input {...register("phone")} className="mt-1 rounded-xl" placeholder="Opcional" />
          </div>

          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
            <Label className="cursor-pointer">Usar como dirección principal</Label>
            <Switch
              checked={isDefault ?? false}
              onCheckedChange={(checked) => setValue("isDefault", checked)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving} className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Guardar dirección"}
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {addresses.length === 0 && !formOpen ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin direcciones guardadas</h2>
          <p className="text-gray-500">Guardá una dirección para agilizar tus próximas compras.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{a.label}</p>
                  {a.isDefault && (
                    <Badge className="bg-brand-blue-subtle text-brand-blue-mid text-[10px] gap-1">
                      <Star className="w-2.5 h-2.5" fill="currentColor" /> Principal
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    title="Editar"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    disabled={deletingId === a.id}
                    title="Eliminar"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    {deletingId === a.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-0.5">
                <p>{a.firstName} {a.lastName}</p>
                <p>{a.street} {a.number}{a.apartment ? `, ${a.apartment}` : ""}</p>
                <p>{a.city}, {a.province} (CP {a.postalCode})</p>
                {a.phone && <p className="text-gray-400">{a.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
