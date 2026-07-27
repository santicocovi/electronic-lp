"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin, toActionError } from "@/lib/auth-guard";
import { slugify } from "@/lib/utils";
import { productSchema } from "@/validations";
import type { ActionResult } from "@/types";
import type { ProductInput } from "@/validations";
import { revalidatePath } from "next/cache";

/** Administración de productos: creación, edición y baja. */

export interface ProductImagePayload {
  url: string;
  alt?: string;
  isMain: boolean;
  order: number;
}

export interface ProductVariantPayload {
  /** Presente al editar: permite actualizar en lugar de recrear. */
  id?: string;
  name: string;
  value: string;
  type: string;
  price?: number;
  stock: number;
  sku?: string;
  order?: number;
}

export interface ProductSpecPayload {
  group: string;
  label: string;
  value: string;
  order: number;
}

/**
 * Convierte cadenas vacías en null.
 *
 * Los `<input>` vacíos llegan como "" y eso provoca dos fallas concretas:
 *   · `sku: ""` choca contra el índice único al cargar el segundo producto
 *     sin SKU (error P2002);
 *   · `categoryId: ""` / `brandId: ""` violan la clave foránea porque "" no
 *     es un id existente.
 */
function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Nivel de alerta de stock, derivado del stock y del umbral configurado. */
function resolveStockAlert(stock: number, lowStockAlert: number) {
  if (stock <= 0) return "OUT_OF_STOCK" as const;
  if (stock <= Math.max(1, Math.floor(lowStockAlert / 2))) return "CRITICAL" as const;
  if (stock <= lowStockAlert) return "LOW" as const;
  return "NORMAL" as const;
}

/** Genera un slug libre, agregando sufijo numérico si ya está tomado. */
async function resolveSlug(desired: string, excludeId?: string): Promise<string> {
  const base = slugify(desired) || `producto-${Date.now()}`;
  let candidate = base;

  for (let i = 2; i < 50; i++) {
    const clash = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash || clash.id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }

  return `${base}-${Date.now()}`;
}

/** Normaliza los campos escalares del producto para Prisma. */
async function buildProductData(data: ProductInput) {
  const categoryId = emptyToNull(data.categoryId);
  const brandId = emptyToNull(data.brandId);

  // Se verifica que las relaciones existan: un id inválido daría un error de
  // clave foránea difícil de interpretar desde el panel.
  if (categoryId) {
    const exists = await db.category.count({ where: { id: categoryId } });
    if (exists === 0) throw new Error("La categoría seleccionada no existe");
  }
  if (brandId) {
    const exists = await db.brand.count({ where: { id: brandId } });
    if (exists === 0) throw new Error("La marca seleccionada no existe");
  }

  const stock = Math.max(0, Math.trunc(data.stock));
  const lowStockAlert = Math.max(0, Math.trunc(data.lowStockAlert ?? 5));

  return {
    name: data.name.trim(),
    shortDescription: emptyToNull(data.shortDescription),
    description: emptyToNull(data.description),
    sku: emptyToNull(data.sku),
    internalCode: emptyToNull(data.internalCode),
    price: new Prisma.Decimal(data.price),
    comparePrice: data.comparePrice != null ? new Prisma.Decimal(data.comparePrice) : null,
    costPrice: data.costPrice != null ? new Prisma.Decimal(data.costPrice) : null,
    stock,
    lowStockAlert,
    stockAlert: resolveStockAlert(stock, lowStockAlert),
    weight: data.weight != null ? new Prisma.Decimal(data.weight) : null,
    warranty: emptyToNull(data.warranty),
    isActive: data.isActive,
    isFeatured: data.isFeatured,
    isNew: data.isNew,
    isOnSale: data.isOnSale,
    freeShipping: data.freeShipping,
    metaTitle: emptyToNull(data.metaTitle),
    metaDesc: emptyToNull(data.metaDesc),
    categoryId,
    brandId,
  };
}

/** Deja exactamente una imagen principal y ordena la galería. */
function normalizeImages(images: ProductImagePayload[], fallbackAlt: string) {
  const clean = images
    .filter((img) => img.url?.trim())
    .map((img, index) => ({
      url: img.url.trim(),
      alt: emptyToNull(img.alt) ?? fallbackAlt,
      order: Number.isFinite(img.order) ? img.order : index,
      isMain: false,
    }))
    .sort((a, b) => a.order - b.order)
    .map((img, index) => ({ ...img, order: index }));

  if (clean.length === 0) return clean;

  // Si el formulario no marcó ninguna (o marcó varias), gana la primera.
  const mainIndex = images.findIndex((img) => img.isMain && img.url?.trim());
  clean[mainIndex >= 0 && mainIndex < clean.length ? mainIndex : 0].isMain = true;

  return clean;
}

function normalizeVariants(variants: ProductVariantPayload[]) {
  return variants
    .filter((v) => v.name?.trim() && v.value?.trim())
    .map((v, index) => ({
      id: v.id,
      name: v.name.trim(),
      value: v.value.trim(),
      type: emptyToNull(v.type) ?? "color",
      price: v.price != null && Number.isFinite(v.price) && v.price > 0 ? new Prisma.Decimal(v.price) : null,
      stock: Math.max(0, Math.trunc(Number(v.stock) || 0)),
      sku: emptyToNull(v.sku),
      order: v.order ?? index,
    }));
}

function normalizeSpecs(specs: ProductSpecPayload[]) {
  return specs
    .filter((s) => s.label?.trim() && s.value?.trim())
    .map((s, index) => ({
      group: emptyToNull(s.group) ?? "General",
      label: s.label.trim(),
      value: s.value.trim(),
      order: Number.isFinite(s.order) ? s.order : index,
    }));
}

function revalidateProduct(slug?: string, id?: string) {
  revalidatePath("/admin/products");
  if (id) revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/", "page");
}

/** Traduce errores de Prisma a mensajes accionables para el administrador. */
function describePrismaError(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;

  if (error.code === "P2002") {
    const target = (error.meta as { target?: string[] })?.target ?? [];
    if (target.includes("sku")) return "Ya existe un producto con ese SKU";
    if (target.includes("slug")) return "Ya existe un producto con ese slug";
    return "Hay un valor duplicado que debe ser único";
  }
  if (error.code === "P2003" || error.code === "P2025") {
    return "La categoría o marca seleccionada no existe";
  }
  return null;
}

export async function createProduct(
  data: ProductInput,
  images: ProductImagePayload[] = [],
  variants: ProductVariantPayload[] = [],
  specs: ProductSpecPayload[] = []
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    await requireAdmin();

    // Revalidación en el servidor: el navegador puede saltear el resolver.
    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const productData = await buildProductData(parsed.data);
    const slug = await resolveSlug(parsed.data.slug || parsed.data.name);

    const normalizedImages = normalizeImages(images, productData.name);
    const normalizedVariants = normalizeVariants(variants);
    const normalizedSpecs = normalizeSpecs(specs);

    const product = await db.product.create({
      data: {
        ...productData,
        slug,
        images: normalizedImages.length > 0 ? { create: normalizedImages } : undefined,
        variants:
          normalizedVariants.length > 0
            ? { create: normalizedVariants.map(({ id: _id, ...v }) => v) }
            : undefined,
        specs: normalizedSpecs.length > 0 ? { create: normalizedSpecs } : undefined,
      },
      select: { id: true, slug: true },
    });

    revalidateProduct(product.slug, product.id);
    return { success: true, data: product };
  } catch (error) {
    const described = describePrismaError(error);
    if (described) return { success: false, error: described };
    if (error instanceof Error && error.message.startsWith("La ")) {
      return { success: false, error: error.message };
    }
    return toActionError(error, "Error al crear el producto");
  }
}

export async function updateProduct(
  id: string,
  data: ProductInput,
  images?: ProductImagePayload[],
  variants?: ProductVariantPayload[],
  specs?: ProductSpecPayload[]
): Promise<ActionResult<{ slug: string }>> {
  try {
    await requireAdmin();

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const existing = await db.product.findUnique({
      where: { id },
      select: { id: true, slug: true, variants: { select: { id: true } } },
    });
    if (!existing) return { success: false, error: "El producto no existe" };

    const productData = await buildProductData(parsed.data);
    const slug = await resolveSlug(parsed.data.slug || parsed.data.name, id);

    const normalizedImages = images ? normalizeImages(images, productData.name) : null;
    const normalizedVariants = variants ? normalizeVariants(variants) : null;
    const normalizedSpecs = specs ? normalizeSpecs(specs) : null;

    await db.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { ...productData, slug } });

      // Las imágenes no las referencia nada más, así que se pueden reemplazar.
      if (normalizedImages) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (normalizedImages.length > 0) {
          await tx.productImage.createMany({
            data: normalizedImages.map((img) => ({ ...img, productId: id })),
          });
        }
      }

      if (normalizedSpecs) {
        await tx.productSpec.deleteMany({ where: { productId: id } });
        if (normalizedSpecs.length > 0) {
          await tx.productSpec.createMany({
            data: normalizedSpecs.map((s) => ({ ...s, productId: id })),
          });
        }
      }

      /**
       * Las variantes NO se borran y recrean.
       *
       * `OrderItem.variantId` y `CartItem.variantId` apuntan a ProductVariant
       * sin borrado en cascada: un delete masivo hacía fallar la edición de
       * cualquier producto que ya se hubiera vendido con variante, y además
       * habría dejado pedidos históricos sin su referencia.
       *
       * En su lugar: se actualizan las que siguen, se crean las nuevas, y las
       * que el administrador quitó se eliminan solo si nadie las referencia
       * (si están referenciadas se desactivan, conservando el histórico).
       */
      if (normalizedVariants) {
        const keptIds = new Set(
          normalizedVariants.map((v) => v.id).filter((v): v is string => Boolean(v))
        );

        for (const variant of normalizedVariants) {
          const { id: variantId, ...values } = variant;

          if (variantId && existing.variants.some((v) => v.id === variantId)) {
            await tx.productVariant.update({
              where: { id: variantId },
              data: { ...values, isActive: true },
            });
          } else {
            await tx.productVariant.create({ data: { ...values, productId: id } });
          }
        }

        const removed = existing.variants.filter((v) => !keptIds.has(v.id));

        for (const variant of removed) {
          const [orderRefs, cartRefs] = await Promise.all([
            tx.orderItem.count({ where: { variantId: variant.id } }),
            tx.cartItem.count({ where: { variantId: variant.id } }),
          ]);

          if (orderRefs > 0) {
            // Referenciada por pedidos: se oculta en lugar de romper el histórico.
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { isActive: false, stock: 0 },
            });
          } else {
            if (cartRefs > 0) {
              await tx.cartItem.deleteMany({ where: { variantId: variant.id } });
            }
            await tx.productVariant.delete({ where: { id: variant.id } });
          }
        }
      }
    });

    revalidateProduct(slug, id);
    if (existing.slug !== slug) revalidatePath(`/products/${existing.slug}`);

    return { success: true, data: { slug } };
  } catch (error) {
    const described = describePrismaError(error);
    if (described) return { success: false, error: described };
    if (error instanceof Error && error.message.startsWith("La ")) {
      return { success: false, error: error.message };
    }
    return toActionError(error, "Error al actualizar el producto");
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const product = await db.product.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true, _count: { select: { orderItems: true } } },
    });
    if (!product) return { success: false, error: "El producto no existe" };

    // `OrderItem.productId` no tiene cascada: borrar un producto vendido
    // rompería los pedidos históricos. Se desactiva en su lugar.
    if (product._count.orderItems > 0) {
      await db.product.update({
        where: { id },
        data: { isActive: false, isFeatured: false, stock: 0, stockAlert: "OUT_OF_STOCK" },
      });
      revalidateProduct(product.slug, id);
      return {
        success: true,
        message: `"${product.name}" tiene ventas registradas, así que se desactivó en lugar de eliminarse para no romper el historial de pedidos.`,
      };
    }

    // Se limpian los carritos que lo tuvieran antes de borrarlo.
    await db.$transaction([
      db.cartItem.deleteMany({ where: { productId: id } }),
      db.wishlistItem.deleteMany({ where: { productId: id } }),
      db.product.delete({ where: { id } }),
    ]);

    revalidateProduct(product.slug, id);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Error al eliminar el producto");
  }
}

export async function toggleProductStatus(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await requireAdmin();
    const product = await db.product.update({
      where: { id },
      data: { isActive },
      select: { slug: true },
    });
    revalidateProduct(product.slug, id);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Error al actualizar el estado");
  }
}

/** Ajuste rápido de stock desde el listado del panel. */
export async function updateProductStock(id: string, stock: number): Promise<ActionResult> {
  try {
    await requireAdmin();

    const value = Math.max(0, Math.trunc(Number(stock)));
    if (!Number.isFinite(value)) return { success: false, error: "Stock inválido" };

    const product = await db.product.findUnique({
      where: { id },
      select: { lowStockAlert: true, slug: true },
    });
    if (!product) return { success: false, error: "El producto no existe" };

    await db.product.update({
      where: { id },
      data: { stock: value, stockAlert: resolveStockAlert(value, product.lowStockAlert) },
    });

    revalidateProduct(product.slug, id);
    return { success: true };
  } catch (error) {
    return toActionError(error, "Error al actualizar el stock");
  }
}
