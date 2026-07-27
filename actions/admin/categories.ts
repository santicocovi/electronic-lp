"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types";
import type { CategoryInput } from "@/validations";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }
}

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  revalidatePath("/");
}

export async function createCategory(data: CategoryInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const slug = data.slug || slugify(data.name);
    const existing = await db.category.findUnique({ where: { slug } });

    const category = await db.category.create({
      data: {
        ...data,
        slug: existing ? `${slug}-${Date.now()}` : slug,
        parentId: data.parentId || null,
      },
    });

    revalidateCategories();
    return { success: true, data: { id: category.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al crear la categoría" };
  }
}

export async function updateCategory(id: string, data: CategoryInput): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (data.parentId === id) {
      return { success: false, error: "Una categoría no puede ser su propia categoría padre" };
    }

    const current = await db.category.findUnique({ where: { id }, select: { slug: true } });
    let slug = data.slug || slugify(data.name);
    if (slug !== current?.slug) {
      const clash = await db.category.findUnique({ where: { slug } });
      if (clash && clash.id !== id) slug = `${slug}-${Date.now()}`;
    }

    await db.category.update({
      data: { ...data, slug, parentId: data.parentId || null },
      where: { id },
    });

    revalidateCategories();
    revalidatePath(`/admin/categories/${id}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al actualizar la categoría" };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const [products, children] = await Promise.all([
      db.product.count({ where: { categoryId: id } }),
      db.category.count({ where: { parentId: id } }),
    ]);

    if (products > 0) {
      return {
        success: false,
        error: `No se puede eliminar: tiene ${products} producto(s) asignado(s)`,
      };
    }
    if (children > 0) {
      return {
        success: false,
        error: `No se puede eliminar: tiene ${children} subcategoría(s)`,
      };
    }

    await db.category.delete({ where: { id } });
    revalidateCategories();
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al eliminar la categoría" };
  }
}
