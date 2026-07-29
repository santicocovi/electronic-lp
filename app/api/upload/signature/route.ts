import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth-guard";
import { buildDirectUploadFields, isCloudinaryConfigured } from "@/lib/cloudinary";

/**
 * Firma para subir archivos DIRECTO del navegador a Cloudinary.
 *
 * ── Por qué existe ────────────────────────────────────────────
 * Las rutas `/api/upload` y `/api/upload/video` reciben el archivo en el
 * servidor y recién ahí lo reenvían a Cloudinary. En Vercel eso choca con un
 * límite duro: el cuerpo de una petición a una Serverless Function no puede
 * superar los 4,5 MB. O sea que en producción una foto de 6 MB o cualquier
 * video real fallaban, y la única forma de que entraran era comprimirlos antes
 * — perdiendo justamente la calidad que se quiere conservar.
 *
 * Subiendo directo, el archivo va del navegador a Cloudinary sin pasar por
 * Vercel, así que ese techo desaparece. El servidor solo firma la operación.
 *
 * ── Seguridad ─────────────────────────────────────────────────
 * La firma la genera el servidor con `CLOUDINARY_API_SECRET`, que nunca sale de
 * acá, y solo para administradores. Cubre exactamente los parámetros que se van
 * a enviar (carpeta, transformaciones, marca de tiempo): Cloudinary rechaza la
 * subida si el navegador intenta cambiar cualquiera de ellos. La `api_key` y el
 * nombre de la cuenta sí viajan al cliente, pero son públicos por diseño —
 * aparecen en la URL de toda imagen entregada.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    const status = error instanceof AuthError && error.code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: "No autorizado" }, { status });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "El almacenamiento no está configurado. Faltan las variables de Cloudinary." },
      { status: 503 }
    );
  }

  let resourceType: unknown;
  try {
    ({ resourceType } = (await req.json()) as { resourceType?: unknown });
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (resourceType !== "image" && resourceType !== "video") {
    return NextResponse.json({ error: "Tipo de archivo inválido" }, { status: 400 });
  }

  try {
    return NextResponse.json(buildDirectUploadFields(resourceType));
  } catch (error) {
    console.error("[upload-signature] No se pudo firmar la subida:", error);
    return NextResponse.json({ error: "No se pudo autorizar la subida" }, { status: 500 });
  }
}
