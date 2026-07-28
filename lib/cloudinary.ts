import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadImage(buffer: Buffer, folder = "electronic-lp/products"): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// ─── Video ────────────────────────────────────────────────────

export interface UploadedVideo {
  /** URL de entrega optimizada (formato y calidad automáticos). */
  url: string;
  /** Imagen de póster, para mostrar mientras el video carga. */
  posterUrl: string;
  /** Identificador en Cloudinary, necesario para poder borrarlo después. */
  publicId: string;
  durationSeconds: number | null;
  bytes: number;
}

/**
 * Sube un video y devuelve URLs ya optimizadas.
 *
 * `eager` genera en el momento una versión recomprimida a 1080p con códec y
 * calidad automáticos, para que el hero no sirva el archivo original pesado.
 * El procesamiento es asincrónico (`eager_async`), así que la subida no espera:
 * mientras tanto Cloudinary entrega la transformación on-the-fly.
 */
export async function uploadHeroVideo(
  buffer: Buffer,
  folder = "electronic-lp/hero"
): Promise<UploadedVideo> {
  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
        // Se sobrescribe siempre el mismo id para no acumular versiones viejas.
        public_id: "hero",
        overwrite: true,
        invalidate: true,
        eager: [
          {
            width: 1920,
            height: 1080,
            crop: "limit",
            quality: "auto",
            video_codec: "auto",
            bit_rate: "3m",
          },
        ],
        eager_async: true,
      },
      (error, uploaded) => {
        if (error || !uploaded) return reject(error ?? new Error("Falló la subida del video"));
        resolve(uploaded as unknown as Record<string, unknown>);
      }
    );
    stream.end(buffer);
  });

  const publicId = String(result.public_id);
  const version = result.version ? `v${result.version}/` : "";
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  return {
    // f_auto entrega webm a Chrome y mp4 a Safari; q_auto ajusta el bitrate.
    url: `https://res.cloudinary.com/${cloudName}/video/upload/f_auto:video,q_auto/${version}${publicId}.mp4`,
    // Primer fotograma como imagen: se muestra al instante y evita el hueco
    // en blanco mientras el video descarga.
    posterUrl: `https://res.cloudinary.com/${cloudName}/video/upload/so_0,f_auto,q_auto,w_1920/${version}${publicId}.jpg`,
    publicId,
    durationSeconds: typeof result.duration === "number" ? result.duration : null,
    bytes: typeof result.bytes === "number" ? result.bytes : 0,
  };
}

/** Borra un asset de Cloudinary. No lanza si ya no existe. */
export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
    return result?.result === "ok" || result?.result === "not found";
  } catch (error) {
    console.error(`[cloudinary] No se pudo borrar ${publicId}:`, error);
    return false;
  }
}
