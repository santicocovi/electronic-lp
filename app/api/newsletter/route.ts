import { NextRequest, NextResponse } from "next/server";
import { subscribeNewsletter } from "@/actions/newsletter";
import { newsletterSchema } from "@/validations";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`newsletter:${getClientIp(req.headers)}`, 5, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Demasiados intentos. Probá más tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Email inválido" }, { status: 400 });
  }

  const result = await subscribeNewsletter(parsed.data.email);
  return NextResponse.json(result);
}
