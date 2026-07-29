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

/**
 * Transformación única del video del Hero.
 *
 * Se define UNA sola vez y se usa tanto para pregenerar el archivo (`eager`)
 * como para armar la URL de entrega. Antes eran dos definiciones distintas: el
 * `eager` producía un 1080p a 3 Mbps que nunca se pedía, y la URL entregaba
 * `q_auto` sobre el original. O sea que el trabajo de pregeneración se
 * desperdiciaba y encima el visitante recibía una versión recomprimida con la
 * calidad "equilibrada" de Cloudinary, más agresiva de lo que un hero a pantalla
 * completa tolera.
 *
 * Qué hace cada parte:
 *   · c_limit,w_1920,h_1080 → reduce solo si el archivo es más grande. Un video
 *     4K no se sirve entero para un hero que como mucho mide 1080 de alto, pero
 *     uno de 720p tampoco se estira.
 *   · q_auto:best → el escalón de mayor calidad de la compresión automática.
 *     Es la diferencia visible contra el `q_auto` que había antes.
 *   · vc_auto → deja que Cloudinary elija el códec.
 *
 * No se fija `bit_rate`: un techo fijo pelea contra `q_auto:best` y termina
 * mandando la calidad justamente donde más se nota (planos con movimiento).
 */
const HERO_VIDEO_TRANSFORM = "c_limit,w_1920,h_1080,q_auto:best,vc_auto";

/** Póster: primer fotograma, a la misma calidad alta. */
const HERO_POSTER_TRANSFORM = "so_0,c_limit,w_1920,q_auto:best";

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
 * El `eager` usa exactamente la MISMA cadena de transformación que la URL de
 * entrega (`raw_transformation`), así que el archivo que pide el visitante es
 * el que Cloudinary ya dejó pregenerado. Antes las dos definiciones estaban
 * escritas por separado y no coincidían.
 *
 * El procesamiento es asincrónico (`eager_async`): la subida no espera. Si el
 * primer visitante llega antes de que termine, Cloudinary genera esa misma
 * transformación al vuelo y a partir de ahí queda cacheada.
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
        eager: [{ raw_transformation: HERO_VIDEO_TRANSFORM }],
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

  return {
    url: buildHeroVideoUrl(publicId, version),
    // Primer fotograma como imagen: se muestra al instante y evita el hueco
    // en blanco mientras el video descarga.
    posterUrl: buildHeroPosterUrl(publicId, version),
    publicId,
    durationSeconds: typeof result.duration === "number" ? result.duration : null,
    bytes: typeof result.bytes === "number" ? result.bytes : 0,
  };
}

// ─── Subida directa desde el navegador ────────────────────────

export interface DirectUploadFields {
  /** Endpoint al que el navegador tiene que hacer el POST. */
  endpoint: string;
  /**
   * Campos que hay que adjuntar al FormData junto al archivo. Incluye la firma,
   * la marca de tiempo y los parámetros firmados: si el navegador modifica
   * cualquiera, Cloudinary rechaza la subida.
   */
  fields: Record<string, string>;
}

/** Carpeta de destino según el tipo de archivo. */
const UPLOAD_FOLDERS = {
  image: "electronic-lp/products",
  video: "electronic-lp/hero",
} as const;

/**
 * Arma y firma los parámetros de una subida directa.
 *
 * Los parámetros del video replican exactamente los que usaba
 * `uploadHeroVideo`, así que el resultado en Cloudinary es idéntico: mismo
 * `public_id`, misma pregeneración de la transformación de alta calidad.
 *
 * Importante: NO se aplica ninguna transformación al subir imágenes. El archivo
 * original queda guardado tal cual; el redimensionado por breakpoint lo hace
 * después `next/image` sobre ese original.
 */
export function buildDirectUploadFields(
  resourceType: "image" | "video"
): DirectUploadFields {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error("Faltan las credenciales de Cloudinary");
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Todo lo que se firma tiene que enviarse igual, y viceversa.
  const signedParams: Record<string, string | number> =
    resourceType === "video"
      ? {
          folder: UPLOAD_FOLDERS.video,
          public_id: "hero",
          overwrite: "true",
          invalidate: "true",
          eager: HERO_VIDEO_TRANSFORM,
          eager_async: "true",
          timestamp,
        }
      : {
          folder: UPLOAD_FOLDERS.image,
          timestamp,
        };

  const signature = cloudinary.utils.api_sign_request(signedParams, apiSecret);

  return {
    endpoint: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(signedParams).map(([k, v]) => [k, String(v)])),
      api_key: apiKey,
      signature,
    },
  };
}

function cloudBase(): string {
  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`;
}

export function buildHeroVideoUrl(publicId: string, version = ""): string {
  return `${cloudBase()}/${HERO_VIDEO_TRANSFORM}/${version}${publicId}.mp4`;
}

export function buildHeroPosterUrl(publicId: string, version = ""): string {
  return `${cloudBase()}/${HERO_POSTER_TRANSFORM}/${version}${publicId}.jpg`;
}

/**
 * Actualiza una URL de Cloudinary guardada con una transformación vieja.
 *
 * Los videos que ya estaban subidos tienen persistida en `SiteSetting` una URL
 * con `q_auto` (calidad media). Sin esto habría que volver a subir el archivo
 * para recuperar la calidad; con esto, basta con recargar la portada: se
 * reescribe el tramo de transformación y se conserva el `public_id` y la
 * versión, que es lo que identifica al archivo.
 *
 * Si la URL no es de Cloudinary —por ejemplo el video local por defecto— se
 * devuelve intacta.
 */
export function upgradeCloudinaryVideoUrl(url: string): string {
  // Sin cloud name configurado no se puede reconstruir la URL: se deja como está.
  if (!process.env.CLOUDINARY_CLOUD_NAME) return url;

  const match = /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/(.+)$/.exec(url);
  if (!match) return url;

  const rest = match[1];
  // El resto es "<transformaciones>/<vNNN>/<public_id>.<ext>" o directamente
  // "<vNNN>/<public_id>.<ext>" cuando no había transformación.
  const versionIndex = rest.search(/(^|\/)v\d+\//);
  if (versionIndex === -1) return url;

  const tail = rest.slice(versionIndex).replace(/^\//, "");
  const [version, ...idParts] = tail.split("/");
  const publicId = idParts.join("/").replace(/\.[a-z0-9]+$/i, "");

  if (!publicId) return url;
  return buildHeroVideoUrl(publicId, `${version}/`);
}

/** Equivalente para el póster. */
export function upgradeCloudinaryPosterUrl(url: string): string {
  // Sin cloud name configurado no se puede reconstruir la URL: se deja como está.
  if (!process.env.CLOUDINARY_CLOUD_NAME) return url;

  const match = /^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/(.+)$/.exec(url);
  if (!match) return url;

  const rest = match[1];
  const versionIndex = rest.search(/(^|\/)v\d+\//);
  if (versionIndex === -1) return url;

  const tail = rest.slice(versionIndex).replace(/^\//, "");
  const [version, ...idParts] = tail.split("/");
  const publicId = idParts.join("/").replace(/\.[a-z0-9]+$/i, "");

  if (!publicId) return url;
  return buildHeroPosterUrl(publicId, `${version}/`);
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
