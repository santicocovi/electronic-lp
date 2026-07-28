import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/product/product-card";
import { serializeProducts } from "@/lib/serialize";

export const metadata = { title: "Favoritos" };

export default async function WishlistPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) redirect("/login?callbackUrl=/wishlist");

  const items = await db.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      product: {
        select: {
          id: true, name: true, slug: true, shortDescription: true,
          price: true, comparePrice: true, priceArs: true, comparePriceArs: true,
          stock: true, isNew: true,
          isOnSale: true, isFeatured: true, freeShipping: true, salesCount: true,
          warranty: true, isActive: true, createdAt: true,
          images: { select: { id: true, url: true, alt: true, order: true, isMain: true }, orderBy: { order: "asc" } },
          variants: { select: { id: true, name: true, value: true, type: true, price: true, stock: true, sku: true, image: true, isActive: true, order: true }, where: { isActive: true } },
          specs: { select: { id: true, group: true, label: true, value: true, order: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  const products = serializeProducts(items.map((i) => i.product).filter((p) => p.isActive));

  return (
    <div className="pt-16 min-h-screen">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-8">
          <h1 className="heading-lg text-gray-900">Favoritos</h1>
          <p className="text-gray-500 mt-1">
            {products.length === 0
              ? "Guardá los productos que te interesan para no perderlos."
              : `${products.length} producto(s) guardado(s)`}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 md:p-16 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-gray-200" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Tu lista está vacía</h2>
            <p className="text-gray-500 mb-6">
              Tocá el corazón en cualquier producto para guardarlo acá.
            </p>
            <Link href="/products">
              <Button className="rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover">
                Explorar productos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} isSaved />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
