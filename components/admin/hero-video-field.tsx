"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Trash2, Film, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { saveHeroVideoAsset, deleteHeroVideo } from "@/actions/admin/hero-video";
import { uploadHeroVideoFile } from "@/lib/upload-client";
import { DEFAULT_HERO_VIDEO, type HeroVideoState } from "@/lib/hero-video";

/**
 * Carga, reemplazo y borrado del video del Hero.
 *
 * El video actual se mantiene intacto hasta que una subida nueva termina bien:
 * si falla, no se pisa nada.
 */

interface HeroVideoFieldProps {
  initial: HeroVideoState;
}

/**
 * 100 MB: el tope de un archivo de video en el plan gratuito de Cloudinary.
 * Antes eran 50 MB por el camino de subida vía servidor; ahora el archivo va
 * directo, así que el único límite real es el de Cloudinary.
 */
const MAX_MB = 100;
const ACCEPTED = ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime";

export function HeroVideoField({ initial }: HeroVideoFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validación en el cliente para dar respuesta inmediata; el servidor
    // vuelve a validar igual, que es donde realmente cuenta.
    if (file.size > MAX_MB * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`El video pesa ${sizeMb} MB y el máximo es ${MAX_MB} MB.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      // El video va directo del navegador a Cloudinary: así no lo alcanza el
      // límite de 4,5 MB que Vercel impone al cuerpo de una petición, que era
      // lo que obligaba a comprimir el archivo antes de subirlo.
      const asset = await uploadHeroVideoFile(file);

      const result = await saveHeroVideoAsset({
        publicId: asset.publicId,
        version: asset.version,
      });

      if (!result.success) {
        setError(result.error);
        toast.add({ title: result.error, type: "error" });
        return;
      }

      // Se relee el estado guardado para mostrar exactamente las URLs de alta
      // calidad que armó el servidor.
      router.refresh();
      setCurrent((prev) => ({ ...prev, isCustom: true }));

      toast.add({
        title: "Video actualizado",
        description: "Ya se ve en la portada, en calidad alta.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Se cortó la conexión durante la subida.";
      setError(message);
      toast.add({ title: "Error al subir", description: message, type: "error" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const result = await deleteHeroVideo();

    if (result.success) {
      setCurrent({ url: DEFAULT_HERO_VIDEO, posterUrl: null, publicId: null, isCustom: false });
      toast.add({ title: "Video eliminado", description: result.message });
      router.refresh();
    } else {
      setError(result.error);
      toast.add({ title: result.error, type: "error" });
    }

    setDeleting(false);
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Film className="w-4 h-4 text-gray-400" aria-hidden="true" />
          Video de la portada
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Se reproduce en bucle, sin sonido, detrás del título principal.
        </p>
      </div>

      {/* Vista previa */}
      <div className="relative overflow-hidden rounded-xl bg-gray-900 aspect-video max-w-md">
        <video
          key={current.url}
          src={current.url}
          poster={current.posterUrl ?? undefined}
          className="w-full h-full object-cover"
          controls
          muted
          playsInline
          preload="metadata"
        />
        <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {current.isCustom ? "Video personalizado" : "Video por defecto"}
        </span>
      </div>

      {error && (
        <p className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleFile}
        />

        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2"
          disabled={uploading || deleting}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="w-4 h-4" aria-hidden="true" />
          )}
          {uploading ? "Subiendo..." : current.isCustom ? "Reemplazar video" : "Subir video"}
        </Button>

        {current.isCustom && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={uploading || deleting}
            onClick={handleDelete}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            )}
            Eliminar
          </Button>
        )}
      </div>

      <ul className="space-y-1.5 text-xs text-gray-400">
        <li className="flex items-center gap-1.5">
          <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
          Formatos: MP4, WebM o MOV. Máximo {MAX_MB} MB.
        </li>
        <li className="flex items-center gap-1.5">
          <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
          Subilo en la mejor calidad que tengas: no hace falta comprimirlo antes.
        </li>
        <li className="flex items-center gap-1.5">
          <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
          Se entrega hasta en 1920×1080 con la máxima calidad de compresión.
        </li>
        <li className="flex items-center gap-1.5">
          <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
          El video actual se mantiene hasta que la subida termine correctamente.
        </li>
      </ul>
    </section>
  );
}
