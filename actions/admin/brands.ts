"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types";
import type { BrandInput } from "@/validations";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }
}

function revalidateBrands() {
  revalidatePath("/admin/brands");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function createBrand(data: BrandInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const slug = data.slug || slugify(data.name);
    const existing = await db.brand.findUnique({ where: { slug } });

    const brand = await db.brand.create({
      data: { ...data, slug: existing ? `${slug}-${Date.now()}` : slug },
    });

    revalidateBrands();
    return { success: true, data: { id: brand.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al crear la marca" };
  }
}

export async function updateBrand(id: string, data: BrandInput): Promise<ActionResult> {
  try {
    await requireAdmin();

    const current = await db.brand.findUnique({ where: { id }, select: { slug: true } });
    let slug = data.slug || slugify(data.name);
    if (slug !== current?.slug) {
      const clash = await db.brand.findUnique({ where: { slug } });
      if (clash && clash.id !== id) slug = `${slug}-${Date.now()}`;
    }

    await db.brand.update({ data: { ...data, slug }, where: { id } });

    revalidateBrands();
    revalidatePath(`/admin/brands/${id}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al actualizar la marca" };
  }
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const products = await db.product.count({ where: { brandId: id } });
    if (products > 0) {
      return {
        success: false,
        error: `No se puede eliminar: tiene ${products} producto(s) asignado(s)`,
      };
    }

    await db.brand.delete({ where: { id } });
    revalidateBrands();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al eliminar la marca" };
  }
}
