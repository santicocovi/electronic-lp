"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) throw new Error("Unauthorized");
}

export async function updateOrderStatus(id: string, status: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.order.update({ where: { id }, data: { status: status as never } });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar el pedido" };
  }
}
