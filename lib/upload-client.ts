/**
 * Subida de archivos desde el navegador.
 *
 * Estrategia en dos pasos:
 *
 *   1. Se pide una firma a `/api/upload/signature` y se manda el archivo
 *      DIRECTO a Cloudinary. Es el camino bueno: el archivo no atraviesa
 *      Vercel, así que no lo alcanza el límite de 4,5 MB del cuerpo de una
 *      Serverless Function y se puede subir la foto o el video en su calidad
 *      original sin comprimirlo antes.
 *
 *   2. Si ese camino falla —Cloudinary sin configurar, un bloqueo de red, una
 *      respuesta inesperada— se cae de vuelta a la ruta de servidor de siempre
 *      (`/api/upload`), que sigue funcionando para archivos chicos. Así el
 *      panel nunca queda sin poder subir nada.
 *
 * Este módulo corre en el cliente y no importa nada del servidor.
 */

/**
 * Mide una imagen antes de subirla, sin tocar el archivo.
 *
 * Sirve para avisarle al administrador cuando la foto es demasiado chica para
 * el lugar donde se va a mostrar. Es el único caso de pérdida de nitidez que no
 * se puede resolver desde el código: `next/image` reduce pero nunca amplía, así
 * que un original de 500 px en un marco de 712 px se ve estirado por más que la
 * compresión esté al máximo.
 */
export function readImageWidth(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) return resolve(null);

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image.naturalWidth || null);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

export interface UploadedAsset {
  /** URL de entrega del archivo original. */
  url: string;
  publicId: string;
  /** Versión del asset en Cloudinary; forma parte de la URL definitiva. */
  version: string;
  bytes: number;
  /** true si se subió directo, false si hubo que usar la ruta de servidor. */
  direct: boolean;
}

interface SignaturePayload {
  endpoint: string;
  fields: Record<string, string>;
}

/** Mensaje de error legible a partir de una respuesta de Cloudinary. */
function describeCloudinaryError(payload: unknown): string {
  const message = (payload as { error?: { message?: string } })?.error?.message;
  if (!message) return "Cloudinary rechazó la subida.";
  if (/file size/i.test(message)) {
    return "El archivo supera el límite de tu plan de Cloudinary.";
  }
  return message;
}

async function uploadDirect(
  file: File,
  resourceType: "image" | "video"
): Promise<UploadedAsset> {
  const signatureResponse = await fetch("/api/upload/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });

  if (!signatureResponse.ok) {
    throw new Error("No se pudo autorizar la subida directa");
  }

  const { endpoint, fields } = (await signatureResponse.json()) as SignaturePayload;

  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  // El archivo va último: algunos proxies truncan si va antes que los campos.
  formData.append("file", file);

  const uploadResponse = await fetch(endpoint, { method: "POST", body: formData });
  const payload = await uploadResponse.json().catch(() => null);

  if (!uploadResponse.ok || !payload?.secure_url) {
    throw new Error(describeCloudinaryError(payload));
  }

  return {
    url: payload.secure_url as string,
    publicId: String(payload.public_id ?? ""),
    version: payload.version ? `v${payload.version}` : "",
    bytes: typeof payload.bytes === "number" ? payload.bytes : file.size,
    direct: true,
  };
}

/** Camino de respaldo: el archivo pasa por el servidor propio. */
async function uploadThroughServer(file: File): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error ?? "No pudimos subir el archivo.");
  }

  return {
    url: payload.url as string,
    publicId: "",
    version: "",
    bytes: file.size,
    direct: false,
  };
}

/**
 * Sube una imagen conservando el archivo original.
 * Intenta la subida directa y, si no se puede, usa la ruta de servidor.
 */
export async function uploadImageFile(file: File): Promise<UploadedAsset> {
  try {
    return await uploadDirect(file, "image");
  } catch (error) {
    console.warn("[upload] Subida directa no disponible, se usa el servidor:", error);
    return uploadThroughServer(file);
  }
}

/**
 * Sube el video del Hero. Acá no hay respaldo por servidor: un video real
 * siempre supera el límite de Vercel, así que si la subida directa no está
 * disponible conviene decirlo en vez de fallar a mitad de camino.
 */
export async function uploadHeroVideoFile(file: File): Promise<UploadedAsset> {
  return uploadDirect(file, "video");
}
