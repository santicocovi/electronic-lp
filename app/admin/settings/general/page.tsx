"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveSettings } from "@/actions/admin/settings";
import { toast } from "@/hooks/use-toast";

interface SettingsForm {
  storeName: string;
  storeDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  heroVideoUrl: string;
  heroCta: string;
  email: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  address: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  freeShippingFrom: string;
}

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<SettingsForm>({
    defaultValues: async () => {
      const res = await fetch("/api/settings");
      return res.json();
    },
  });

  async function onSubmit(data: SettingsForm) {
    setSaving(true);
    const result = await saveSettings(data as unknown as Record<string, string>);
    if (result.success) {
      toast.add({ title: "Configuración guardada" });
    } else {
      toast.add({ title: "Error al guardar", type: "error" });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración general</h1>
        <p className="text-sm text-gray-500 mt-1">Administrá todos los textos y datos del sitio desde aquí.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general">
          <TabsList className="rounded-xl">
            <TabsTrigger value="general" className="rounded-lg">General</TabsTrigger>
            <TabsTrigger value="hero" className="rounded-lg">Hero</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-lg">Contacto</TabsTrigger>
            <TabsTrigger value="seo" className="rounded-lg">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <Label>Nombre de la tienda</Label>
                <Input {...register("storeName")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Descripción de la tienda</Label>
                <Textarea {...register("storeDescription")} className="mt-1 rounded-xl" rows={3} />
              </div>
              <div>
                <Label>Envío gratis desde (en pesos)</Label>
                <Input {...register("freeShippingFrom")} type="number" className="mt-1 rounded-xl" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hero" className="space-y-4 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <Label>Título principal del Hero</Label>
                <Input {...register("heroTitle")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Subtítulo del Hero</Label>
                <Textarea {...register("heroSubtitle")} className="mt-1 rounded-xl" rows={2} />
              </div>
              <div>
                <Label>Texto del botón CTA</Label>
                <Input {...register("heroCta")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>URL del video Hero (ej: /videos/hero.mp4)</Label>
                <Input {...register("heroVideoUrl")} className="mt-1 rounded-xl" />
                <p className="text-xs text-gray-400 mt-1">Subí el video a la carpeta /public/videos/ del proyecto</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <Label>Email de contacto</Label>
                <Input {...register("email")} type="email" className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>WhatsApp (solo números, con código de país)</Label>
                <Input {...register("whatsapp")} className="mt-1 rounded-xl" placeholder="5492214358517" />
              </div>
              <div>
                <Label>Instagram (URL completa)</Label>
                <Input {...register("instagram")} className="mt-1 rounded-xl" placeholder="https://instagram.com/tu-cuenta" />
              </div>
              <div>
                <Label>Facebook (URL completa)</Label>
                <Input {...register("facebook")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Dirección física</Label>
                <Input {...register("address")} className="mt-1 rounded-xl" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 mt-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div>
                <Label>Meta Title (título para buscadores)</Label>
                <Input {...register("metaTitle")} className="mt-1 rounded-xl" />
                <p className="text-xs text-gray-400 mt-1">Recomendado: 50-60 caracteres</p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea {...register("metaDescription")} className="mt-1 rounded-xl" rows={3} />
                <p className="text-xs text-gray-400 mt-1">Recomendado: 150-160 caracteres</p>
              </div>
              <div>
                <Label>Keywords (separadas por coma)</Label>
                <Input {...register("metaKeywords")} className="mt-1 rounded-xl" />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Button type="submit" className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover gap-2" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar configuración
        </Button>
      </form>
    </div>
  );
}
