"use server";

import { auth } from "@/auth";
import { updateManySettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) throw new Error("Unauthorized");
}

export async function saveSettings(settings: Record<string, string>, group = "general"): Promise<ActionResult> {
  try {
    await requireAdmin();
    await updateManySettings(settings, group);
    revalidatePath("/");
    revalidatePath("/admin/settings/general");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar la configuración" };
  }
}
