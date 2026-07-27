"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import type { ActionResult } from "@/types";
import type { CouponInput } from "@/validations";
import { startOfStoreDay, endOfStoreDay } from "@/lib/dates";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }
}

function toCouponData(data: CouponInput) {
  return {
    code: data.code,
    description: data.description,
    type: data.type,
    value: data.value,
    minOrderAmount: data.minOrderAmount ?? null,
    maxDiscount: data.maxDiscount ?? null,
    usageLimit: data.usageLimit ?? null,
    perUserLimit: data.perUserLimit ?? null,
    isActive: data.isActive,
    startsAt: startOfStoreDay(data.startsAt),
    // Inclusive: a coupon expiring on the 31st is valid through all of the 31st.
    expiresAt: endOfStoreDay(data.expiresAt),
  };
}

export async function createCoupon(data: CouponInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();

    const existing = await db.coupon.findUnique({ where: { code: data.code } });
    if (existing) {
      return { success: false, error: "Ya existe un cupón con ese código" };
    }

    const coupon = await db.coupon.create({ data: toCouponData(data) });

    revalidatePath("/admin/promotions/coupons");
    return { success: true, data: { id: coupon.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al crear el cupón" };
  }
}

export async function updateCoupon(id: string, data: CouponInput): Promise<ActionResult> {
  try {
    await requireAdmin();

    const clash = await db.coupon.findUnique({ where: { code: data.code } });
    if (clash && clash.id !== id) {
      return { success: false, error: "Ya existe otro cupón con ese código" };
    }

    await db.coupon.update({ data: toCouponData(data), where: { id } });

    revalidatePath("/admin/promotions/coupons");
    revalidatePath(`/admin/promotions/coupons/${id}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al actualizar el cupón" };
  }
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const orders = await db.order.count({ where: { couponId: id } });
    if (orders > 0) {
      return {
        success: false,
        error: `No se puede eliminar: fue usado en ${orders} pedido(s). Desactivalo en su lugar.`,
      };
    }

    await db.coupon.delete({ where: { id } });
    revalidatePath("/admin/promotions/coupons");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al eliminar el cupón" };
  }
}
