import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
  }

  /**
   * Camino de respaldo. El panel sube directo a Cloudinary (ver
   * lib/upload-client) y solo cae acá si esa vía no está disponible.
   *
   * Ojo con el tope: en Vercel el cuerpo de una petición a una Serverless
   * Function no puede pasar de 4,5 MB, así que por esta ruta un archivo más
   * grande se corta antes de llegar a este código. Es exactamente el motivo por
   * el que existe la subida directa.
   */
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen no puede superar 8MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadImage(buffer);
    return NextResponse.json({ url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }
}
