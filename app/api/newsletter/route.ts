import { NextRequest, NextResponse } from "next/server";
import { subscribeNewsletter } from "@/actions/newsletter";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const result = await subscribeNewsletter(email);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
