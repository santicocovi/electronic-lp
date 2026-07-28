import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { serializeProduct, serializeProducts } from "@/lib/serialize";
import { ProductGallery } from "@/components/shop/product/product-gallery";
import { ProductInfo } from "@/components/shop/product/product-info";
import { ProductSpecs } from "@/components/shop/product/product-specs";
import { ProductsSection } from "@/components/shop/home/products-section";
import { PaymentTerms } from "@/components/shop/payment-terms";
import { getExchangeRate } from "@/lib/currency";
import { getPricingConfig } from "@/lib/pricing";

interface Props {
  params: Promise<{ slug: string }>;
}

const PRODUCT_SELECT = {
  id: true, name: true, slug: true, shortDescription: true, description: true,
  sku: true, price: true, comparePrice: true, priceArs: true, comparePriceArs: true,
  stock: true, isNew: true,
  isOnSale: true, isFeatured: true, freeShipping: true, salesCount: true,
  warranty: true, isActive: true, createdAt: true, internalCode: true, categoryId: true,
  images: { select: { id: true, url: true, alt: true, order: true, isMain: true }, orderBy: { order: "asc" as const } },
  variants: { select: { id: true, name: true, value: true, type: true, price: true, stock: true, sku: true, image: true, isActive: true, order: true }, where: { isActive: true }, orderBy: { order: "asc" as const } },
  specs: { select: { id: true, group: true, label: true, value: true, order: true }, orderBy: { order: "asc" as const } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, select: { name: true, shortDescription: true } });
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    openGraph: { title: product.name, description: product.shortDescription ?? undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    select: PRODUCT_SELECT,
  });

  if (!product) notFound();

  // Increment view count (fire & forget)
  db.product.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const [related, session] = await Promise.all([
    db.product.findMany({
      where: {
        isActive: true,
        // Only narrow by category when the product actually has one, otherwise
        // `undefined` would silently drop the filter and match anything.
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
        slug: { not: slug },
      },
      select: PRODUCT_SELECT,
      take: 4,
      orderBy: { salesCount: "desc" },
    }),
    auth(),
  ]);

  const userId = (session?.user as { id?: string })?.id;
  const isSaved = userId
    ? !!(await db.wishlistItem.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
        select: { id: true },
      }))
    : false;

  // Cotización y recargos para mostrar el precio de referencia en pesos.
  const [rate, pricing] = await Promise.all([getExchangeRate(), getPricingConfig()]);

  const serialized = serializeProduct(product);

  return (
    <div className="pt-16">
      <div className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery product={serialized} />
          <ProductInfo
            product={serialized}
            isSaved={isSaved}
            exchangeRate={rate.rate}
            baseCurrency={pricing.baseCurrency}
            arsSurchargePercent={pricing.surcharges.CASH_ARS}
          />
        </div>

        {/* Medios de pago y condiciones comerciales */}
        <div className="mt-16 sm:mt-20">
          <PaymentTerms />
        </div>

        {product.specs.length > 0 && (
          <div className="mt-16 border-t border-gray-100 pt-16 sm:mt-20 sm:pt-20">
            <ProductSpecs specs={product.specs} />
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="border-t border-gray-100">
          <ProductsSection
            tag="También te puede interesar"
            title="Productos relacionados"
            products={serializeProducts(related)}
          />
        </div>
      )}
    </div>
  );
}
