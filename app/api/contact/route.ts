import { NextRequest, NextResponse } from "next/server";
import {
  sendContactFormEmail,
  sendContactAcknowledgement,
  isMailConfigured,
} from "@/lib/mail";
import { contactSchema } from "@/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Formulario de contacto: envía el mensaje a la casilla interna de la tienda. */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // 5 mensajes por hora por IP: frena el spam automatizado sin molestar a nadie.
  const limit = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      {
        success: false,
        error: `Ya enviaste varios mensajes. Probá de nuevo en ${Math.ceil(limit.retryAfterSeconds / 60)} minutos.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Solicitud inválida" }, { status: 400 });
  }

  // Honeypot: un bot completa todos los campos, incluido el oculto.
  if (typeof (body as { website?: unknown })?.website === "string" && (body as { website: string }).website.length > 0) {
    // Se responde como si hubiera funcionado para no darle pistas al bot.
    return NextResponse.json({ success: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  if (!isMailConfigured()) {
    console.error("[contact] SMTP sin configurar: el mensaje no se pudo enviar.");
    return NextResponse.json(
      {
        success: false,
        error:
          "El envío de emails no está disponible en este momento. Escribinos por WhatsApp y te respondemos al instante.",
      },
      { status: 503 }
    );
  }

  const data = parsed.data;

  try {
    await sendContactFormEmail(data.name, data.email, data.subject, data.message, data.phone);
  } catch (error) {
    console.error("[contact] Falló el envío del mensaje:", error);
    return NextResponse.json(
      { success: false, error: "No pudimos enviar tu mensaje. Intentá de nuevo en unos minutos." },
      { status: 502 }
    );
  }

  // El acuse al cliente es secundario: si falla, el mensaje ya llegó igual.
  await sendContactAcknowledgement(data.name, data.email, data.subject);

  return NextResponse.json({ success: true });
}
