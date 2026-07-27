"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionResult } from "@/types";

async function getUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { id?: string })?.id ?? null;
}

export async function toggleWishlist(
  productId: string
): Promise<ActionResult<{ added: boolean }>> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "Ingresá para guardar favoritos" };

    const existing = await db.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } });
      revalidatePath("/wishlist");
      return { success: true, data: { added: false } };
    }

    await db.wishlistItem.create({ data: { userId, productId } });
    revalidatePath("/wishlist");
    return { success: true, data: { added: true } };
  } catch {
    return { success: false, error: "Error al actualizar favoritos" };
  }
}

export async function removeFromWishlist(productId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    if (!userId) return { success: false, error: "No autorizado" };

    await db.wishlistItem.deleteMany({ where: { userId, productId } });
    revalidatePath("/wishlist");
    return { success: true };
  } catch {
    return { success: false, error: "Error al quitar de favoritos" };
  }
}

/** Product ids the signed-in user has saved; empty for guests. */
export async function getWishlistProductIds(): Promise<string[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const items = await db.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return items.map((i) => i.productId);
}
