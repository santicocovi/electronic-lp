import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    ...categories.map((c) => ({
      url: `${BASE}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${BASE}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
