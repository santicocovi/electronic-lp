import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth-guard";
import { uploadHeroVideo, isCloudinaryConfigured } from "@/lib/cloudinary";

/**
 * Subida del video del Hero.
 *
 * Se separa del endpoint de imágenes porque las reglas son distintas: otros
 * formatos, otro límite de tamaño y otro tipo de recurso en Cloudinary.
 */

export const dynamic = "force-dynamic";
// Subir y transcodificar un video tarda más que una imagen.
export const maxDuration = 60;

/** Formatos que los navegadores reproducen sin plugins. */
const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]);

const ALLOWED_EXTENSIONS = [".mp4", ".webm", ".mov"];

/**
 * 50 MB. Suficiente para un hero de 15-30s en buena calidad y por debajo del
 * límite de 100 MB del plan gratuito de Cloudinary.
 */
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    const status = error instanceof AuthError && error.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: "No autorizado" }, { status });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "El almacenamiento de videos no está configurado. Faltan las variables de Cloudinary.",
      },
      { status: 503 }
    );
  }

  let file: FormDataEntryValue | null;
  try {
    const formData = await req.formData();
    file = formData.get("file");
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  // Se valida por MIME y por extensión: algunos navegadores mandan el MIME
  // vacío para .mov y confiar solo en uno deja pasar archivos que no son video.
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const mimeOk = ALLOWED_MIME.has(file.type);
  const extensionOk = ALLOWED_EXTENSIONS.includes(extension);

  if (!mimeOk && !extensionOk) {
    return NextResponse.json(
      { error: "Formato no compatible. Usá MP4, WebM o MOV." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return NextResponse.json(
      { error: `El video pesa ${sizeMb} MB y el máximo es 50 MB. Comprimilo e intentá de nuevo.` },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadHeroVideo(buffer);

    return NextResponse.json({
      url: uploaded.url,
      posterUrl: uploaded.posterUrl,
      publicId: uploaded.publicId,
      durationSeconds: uploaded.durationSeconds,
      bytes: uploaded.bytes,
    });
  } catch (error) {
    console.error("[upload-video] Falló la subida:", error);
    return NextResponse.json(
      { error: "No pudimos subir el video. Probá con un archivo más liviano." },
      { status: 502 }
    );
  }
}
