import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/mail";
import { contactSchema } from "@/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);
    await sendContactFormEmail(data.name, data.email, data.subject, data.message, data.phone);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Error al enviar el mensaje" }, { status: 500 });
  }
}
