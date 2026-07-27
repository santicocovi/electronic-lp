"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, calculateDiscount, getProductWhatsAppUrl } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";
import { useCartStore } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import { WishlistButton } from "@/components/shop/product/wishlist-button";
import type { ProductWithRelations } from "@/types";

interface ProductCardProps {
  product: ProductWithRelations;
  className?: string;
  /** Whether the signed-in user already saved this product. */
  isSaved?: boolean;
}

export function ProductCard({ product, className, isSaved = false }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  // Respeta la moneda que el visitante eligió ver (USD o ARS).
  const { format: formatMoney } = useCurrency();

  const mainImage =
    product.images.find((i) => i.isMain)?.url ??
    product.images[0]?.url ??
    "/images/placeholder.svg";

  const discount = calculateDiscount(product.comparePrice, product.price);
  const inStock = product.stock > 0;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!inStock) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: mainImage,
      quantity: 1,
      stock: product.stock,
    });
    toast.add({ title: "Agregado al carrito", description: product.name });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn("group", className)}
    >
      <Link href={`/products/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isNew && (
              <Badge className="bg-brand-blue-mid text-white text-xs px-2">Nuevo</Badge>
            )}
            {discount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2">-{discount}%</Badge>
            )}
            {!inStock && (
              <Badge variant="outline" className="bg-white text-xs px-2">Sin stock</Badge>
            )}
            {product.freeShipping && (
              <Badge className="bg-green-500 text-white text-xs px-2">Envío gratis</Badge>
            )}
          </div>

          {/* Quick actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 focus-within:translate-x-0">
            <WishlistButton
              productId={product.id}
              initialSaved={isSaved}
              className="w-9 h-9 bg-white rounded-xl shadow-sm hover:bg-red-50"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(getProductWhatsAppUrl(product.name), "_blank", "noopener,noreferrer");
              }}
              className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center hover:bg-green-50 transition-colors"
              title="Consultar por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
            </button>
          </div>

          {/* Add to cart overlay */}
          {inStock && (
            <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <Button
                size="sm"
                className="w-full rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover text-white gap-2 shadow-lg"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-4 h-4" />
                Agregar
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          {product.brand && (
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              {product.brand.name}
            </p>
          )}
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-brand-blue-mid transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">
              {formatMoney(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-400 line-through">
                {formatMoney(product.comparePrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
