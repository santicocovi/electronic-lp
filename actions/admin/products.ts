"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types";
import type { ProductInput } from "@/validations";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    throw new Error("Unauthorized");
  }
}

export async function createProduct(
  data: ProductInput,
  images: { url: string; alt?: string; isMain: boolean; order: number }[],
  variants: { name: string; value: string; type: string; price?: number; stock: number; sku?: string }[],
  specs: { group: string; label: string; value: string; order: number }[]
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const slug = data.slug || slugify(data.name);
    const existing = await db.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const product = await db.product.create({
      data: {
        ...data,
        slug: finalSlug,
        price: data.price,
        comparePrice: data.comparePrice,
        costPrice: data.costPrice,
        images: images.length > 0 ? { create: images } : undefined,
        variants: variants.length > 0 ? { create: variants } : undefined,
        specs: specs.length > 0 ? { create: specs } : undefined,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true, data: { id: product.id } };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al crear el producto" };
  }
}

export async function updateProduct(
  id: string,
  data: Partial<ProductInput>,
  images?: { url: string; alt?: string; isMain: boolean; order: number }[],
  variants?: { name: string; value: string; type: string; price?: number; stock: number; sku?: string }[],
  specs?: { group: string; label: string; value: string; order: number }[]
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const existing = await db.product.findUnique({ where: { id }, select: { slug: true } });
    let slug = data.slug;
    if (slug && slug !== existing?.slug) {
      const clash = await db.product.findUnique({ where: { slug } });
      if (clash && clash.id !== id) slug = `${slug}-${Date.now()}`;
    }

    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { ...data, slug } });

      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length > 0) {
          await tx.productImage.createMany({ data: images.map((img) => ({ ...img, productId: id })) });
        }
      }

      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({ data: variants.map((v) => ({ ...v, productId: id })) });
        }
      }

      if (specs) {
        await tx.productSpec.deleteMany({ where: { productId: id } });
        if (specs.length > 0) {
          await tx.productSpec.createMany({ data: specs.map((s) => ({ ...s, productId: id })) });
        }
      }
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al actualizar el producto" };
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Error al eliminar el producto" };
  }
}

export async function toggleProductStatus(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    await db.product.update({ where: { id }, data: { isActive } });
    revalidatePath("/admin/products");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar el estado" };
  }
}
