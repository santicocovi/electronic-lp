import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getHeroVideo } from "@/actions/admin/hero-video";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { HeroVideoField } from "@/components/admin/hero-video-field";

export const metadata = { title: "Video de portada | Admin" };

export default async function HeroSettingsPage() {
  const [video, cloudinaryReady] = await Promise.all([
    getHeroVideo(),
    Promise.resolve(isCloudinaryConfigured()),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/settings/general"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver a configuración
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Video de portada</h1>
        <p className="text-sm text-gray-500 mt-1">
          Subí, reemplazá o eliminá el video que se ve detrás del título en la página principal.
        </p>
      </header>

      {!cloudinaryReady && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Falta configurar el almacenamiento</p>
            <p className="mt-0.5">
              Para poder subir videos hay que completar <code>CLOUDINARY_CLOUD_NAME</code>,{" "}
              <code>CLOUDINARY_API_KEY</code> y <code>CLOUDINARY_API_SECRET</code> en las variables
              de entorno. Mientras tanto se sigue mostrando el video por defecto.
            </p>
          </div>
        </div>
      )}

      <HeroVideoField initial={video} />
    </div>
  );
}
