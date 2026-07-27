import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSiteSettings } from "@/lib/settings";
import { serializeProducts } from "@/lib/serialize";
import { Hero } from "@/components/shop/home/hero";
import { CategoriesSection } from "@/components/shop/home/categories-section";
import { ProductsSection } from "@/components/shop/home/products-section";
import { FeaturedCarousel } from "@/components/shop/home/featured-carousel";
import { BrandsSection } from "@/components/shop/home/brands-section";
import { BenefitsSection } from "@/components/shop/home/benefits-section";
import { TestimonialsSection } from "@/components/shop/home/testimonials-section";
import { FAQSection } from "@/components/shop/home/faq-section";
import { NewsletterSection } from "@/components/shop/home/newsletter-section";
import type { CategoryWithChildren, ProductWithRelations } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    openGraph: {
      title: s.metaTitle,
      description: s.metaDescription,
      type: "website",
    },
  };
}

const PRODUCT_SELECT = {
  id: true, name: true, slug: true, shortDescription: true,
  price: true, comparePrice: true, stock: true, isNew: true,
  isOnSale: true, isFeatured: true, freeShipping: true, salesCount: true,
  warranty: true, isActive: true, createdAt: true,
  images: { select: { id: true, url: true, alt: true, order: true, isMain: true }, orderBy: { order: "asc" as const } },
  variants: { select: { id: true, name: true, value: true, type: true, price: true, stock: true, sku: true, image: true, isActive: true, order: true }, where: { isActive: true } },
  specs: { select: { id: true, group: true, label: true, value: true, order: true } },
  brand: { select: { id: true, name: true, slug: true, logo: true } },
  category: { select: { id: true, name: true, slug: true } },
};


export default async function HomePage() {
  const [settings, categories, featured, newProducts, onSale, testimonials, faqs, brands] =
    await Promise.all([
      getSiteSettings(),
      db.category.findMany({
        where: { isActive: true, parentId: null },
        orderBy: { order: "asc" },
        include: {
          children: true,
          _count: { select: { products: { where: { isActive: true } } } },
        },
        take: 10,
      }),
      db.product.findMany({
        where: { isActive: true, isFeatured: true },
        select: PRODUCT_SELECT,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.product.findMany({
        where: { isActive: true, isNew: true },
        select: PRODUCT_SELECT,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.product.findMany({
        where: { isActive: true, isOnSale: true },
        select: PRODUCT_SELECT,
        orderBy: { salesCount: "desc" },
        take: 8,
      }),
      db.testimonial.findMany({
        where: { isApproved: true },
        orderBy: { order: "asc" },
        take: 6,
      }),
      db.fAQ.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      }),
      db.brand.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, logo: true },
        take: 12,
      }),
    ]);

  return (
    <>
      <Hero
        videoUrl={settings.heroVideoUrl}
        title={settings.heroTitle}
        subtitle={settings.heroSubtitle}
        cta={settings.heroCta}
      />

      <CategoriesSection categories={categories as unknown as CategoryWithChildren[]} />

      <BrandsSection brands={brands} />

      {featured.length > 0 && (
        <FeaturedCarousel
          tag="Selección"
          title="Productos destacados"
          products={serializeProducts(featured)}
          viewAllHref="/products?filter=featured"
        />
      )}

      {newProducts.length > 0 && (
        <div className="bg-gray-50/50">
          <ProductsSection
            tag="Nuevos"
            title="Últimos ingresos"
            subtitle="Los productos más recientes de nuestra tienda"
            products={serializeProducts(newProducts)}
            viewAllHref="/products?filter=new"
          />
        </div>
      )}

      {onSale.length > 0 && (
        <ProductsSection
          tag="Ofertas"
          title="Productos en oferta"
          subtitle="Aprovechá los mejores precios"
          products={serializeProducts(onSale)}
          viewAllHref="/products?filter=sale"
        />
      )}

      <BenefitsSection />

      <TestimonialsSection testimonials={testimonials} />

      <FAQSection faqs={faqs} />

      <NewsletterSection />
    </>
  );
}
