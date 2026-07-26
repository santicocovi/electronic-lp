"use server";

import { db } from "@/lib/db";
import type { ActionResult } from "@/types";

export async function subscribeNewsletter(email: string): Promise<ActionResult> {
  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { isActive: true },
    });
    return { success: true, message: "Suscripción exitosa" };
  } catch {
    return { success: false, error: "Error al suscribir. Intentá nuevamente." };
  }
}
