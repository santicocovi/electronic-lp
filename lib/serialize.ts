import type { ProductWithRelations } from "@/types";

/**
 * Prisma returns money columns as Decimal instances. Those can't be handed to a
 * Client Component (or returned from a server action) — they arrive mangled and
 * break formatPrice(). Coerce every money field to a plain number first.
 */
export function serializeProduct<T extends Record<string, unknown>>(
  product: T
): ProductWithRelations {
  return {
    ...product,
    price: Number(product.price),
    comparePrice: product.comparePrice != null ? Number(product.comparePrice) : null,
    variants: ((product.variants ?? []) as { price: unknown }[]).map((v) => ({
      ...v,
      price: v.price != null ? Number(v.price) : null,
    })),
  } as unknown as ProductWithRelations;
}

export function serializeProducts<T extends Record<string, unknown>>(
  products: T[]
): ProductWithRelations[] {
  return products.map(serializeProduct);
}
