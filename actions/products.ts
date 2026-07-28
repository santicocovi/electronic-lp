"use server";

import { db } from "@/lib/db";
import { serializeProducts } from "@/lib/serialize";
import type { FilterParams, PaginatedResult, ProductWithRelations } from "@/types";

const PRODUCT_SELECT = {
  id: true, name: true, slug: true, shortDescription: true,
  price: true, comparePrice: true, priceArs: true, comparePriceArs: true,
  stock: true, isNew: true,
  isOnSale: true, isFeatured: true, freeShipping: true, salesCount: true,
  warranty: true, isActive: true, createdAt: true,
  images: { select: { id: true, url: true, alt: true, order: true, isMain: true }, orderBy: { order: "asc" as const }, take: 3 },
  variants: { select: { id: true, name: true, value: true, type: true, price: true, stock: true, sku: true, image: true, isActive: true, order: true }, where: { isActive: true } },
  specs: { select: { id: true, group: true, label: true, value: true, order: true } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
};

export async function getProducts(
  filters: FilterParams
): Promise<PaginatedResult<ProductWithRelations>> {
  const {
    category, brand, minPrice, maxPrice, inStock,
    isNew, isOnSale, isFeatured, sortBy = "newest",
    search, page = 1, limit = 24,
  } = filters;

  const where: Record<string, unknown> = { isActive: true };

  if (category) {
    const cat = await db.category.findUnique({ where: { slug: category } });
    if (cat) where.categoryId = cat.id;
  }

  if (brand) {
    const b = await db.brand.findUnique({ where: { slug: brand } });
    if (b) where.brandId = b.id;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) (where.price as Record<string, number>).gte = minPrice;
    if (maxPrice !== undefined) (where.price as Record<string, number>).lte = maxPrice;
  }

  if (inStock) where.stock = { gt: 0 };
  if (isNew) where.isNew = true;
  if (isOnSale) where.isOnSale = true;
  if (isFeatured) where.isFeatured = true;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { shortDescription: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, string> =
    sortBy === "price_asc" ? { price: "asc" }
    : sortBy === "price_desc" ? { price: "desc" }
    : sortBy === "popular" ? { salesCount: "desc" }
    : sortBy === "name_asc" ? { name: "asc" }
    : { createdAt: "desc" };

  const [total, items] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      select: PRODUCT_SELECT,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    items: serializeProducts(items),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
