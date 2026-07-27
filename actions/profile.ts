"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionResult } from "@/types";
import type { AddressInput, ChangePasswordInput, ProfileInput } from "@/validations";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = (session?.user as { id?: string })?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function updateProfile(data: ProfileInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.user.update({
      where: { id: userId },
      data: { name: data.name, phone: data.phone?.trim() || null },
    });
    revalidatePath("/profile");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar los datos" };
  }
}

export async function changePassword(data: ChangePasswordInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const user = await db.user.findUnique({ where: { id: userId }, select: { password: true } });

    // Accounts created through Google have no password to compare against.
    if (!user?.password) {
      return { success: false, error: "Tu cuenta no usa contraseña. Ingresá con Google." };
    }

    const matches = await bcrypt.compare(data.currentPassword, user.password);
    if (!matches) return { success: false, error: "La contraseña actual no es correcta" };

    await db.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(data.password, 12) },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Error al cambiar la contraseña" };
  }
}

/** Clears the default flag on the user's other addresses. */
async function clearOtherDefaults(userId: string, keepId?: string) {
  await db.address.updateMany({
    where: { userId, isDefault: true, ...(keepId ? { id: { not: keepId } } : {}) },
    data: { isDefault: false },
  });
}

export async function createAddress(data: AddressInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const count = await db.address.count({ where: { userId } });
    // The first address a customer saves is always their default.
    const isDefault = data.isDefault || count === 0;

    if (isDefault) await clearOtherDefaults(userId);
    await db.address.create({ data: { ...data, isDefault, userId } });

    revalidatePath("/profile/addresses");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar la dirección" };
  }
}

export async function updateAddress(id: string, data: AddressInput): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const owned = await db.address.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owned) return { success: false, error: "Dirección no encontrada" };

    if (data.isDefault) await clearOtherDefaults(userId, id);
    await db.address.update({ where: { id }, data });

    revalidatePath("/profile/addresses");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar la dirección" };
  }
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const address = await db.address.findFirst({ where: { id, userId } });
    if (!address) return { success: false, error: "Dirección no encontrada" };

    // Past orders reference this row, but they already store their own
    // shipping snapshot — detach them so the delete doesn't hit the FK.
    await db.order.updateMany({ where: { addressId: id }, data: { addressId: null } });
    await db.address.delete({ where: { id } });

    // Never leave the customer without a default address.
    if (address.isDefault) {
      const next = await db.address.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
      if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    revalidatePath("/profile/addresses");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar la dirección" };
  }
}
