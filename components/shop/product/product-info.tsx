"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShoppingCart, MessageCircle, Share2, Heart, Check,
  Shield, Truck, RefreshCcw, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import {
  formatPrice, calculateDiscount, getStockLabel,
  getProductWhatsAppUrl, getShareWhatsAppUrl,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProductWithRelations, ProductVariantType } from "@/types";

interface ProductInfoProps {
  product: ProductWithRelations;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const price = selectedVariant?.price ?? product.price;
  const stock = selectedVariant?.stock ?? product.stock;
  const discount = calculateDiscount(price, product.comparePrice);
  const { label: stockLabel, color: stockColor } = getStockLabel(stock);
  const mainImage = product.images.find((i) => i.isMain)?.url ?? product.images[0]?.url ?? "/images/placeholder.png";

  // Group variants by type
  const variantGroups = product.variants.reduce<Record<string, ProductVariantType[]>>((acc, v) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  function handleAddToCart() {
    if (stock === 0) return;
    addItem({
      id: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price,
      image: selectedVariant?.image ?? mainImage,
      quantity,
      stock,
      variantName: selectedVariant ? `${selectedVariant.name}: ${selectedVariant.value}` : undefined,
    });
    setAdded(true);
    toast.add({ title: "Agregado al carrito ✓", description: product.name });
    setTimeout(() => setAdded(false), 2000);
  }

  const whatsappUrl = getProductWhatsAppUrl(`${product.name}${selectedVariant ? ` – ${selectedVariant.value}` : ""}`);
  const shareUrl = getShareWhatsAppUrl(product.name, `${process.env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`);

  return (
    <div className="space-y-6">
      {/* Brand & breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        {product.category && (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-brand-blue-mid transition-colors">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        {product.brand && (
          <Link href={`/products?brand=${product.brand.slug}`} className="hover:text-brand-blue-mid transition-colors">
            {product.brand.name}
          </Link>
        )}
      </div>

      {/* Title */}
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {product.isNew && <Badge className="bg-brand-blue-mid text-white">Nuevo</Badge>}
          {product.isOnSale && <Badge className="bg-red-500 text-white">En oferta</Badge>}
          {product.freeShipping && <Badge className="bg-green-500 text-white">Envío gratis</Badge>}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{product.name}</h1>
        {product.sku && (
          <p className="text-xs text-gray-400 mt-1">SKU: {product.sku}</p>
        )}
      </div>

      {/* Price */}
      <div className="flex items-end gap-4">
        <span className="text-4xl font-bold text-gray-900">{formatPrice(price)}</span>
        {product.comparePrice && product.comparePrice > price && (
          <>
            <span className="text-xl text-gray-400 line-through mb-1">{formatPrice(product.comparePrice)}</span>
            {discount > 0 && (
              <Badge className="bg-red-100 text-red-600 mb-1">-{discount}% OFF</Badge>
            )}
          </>
        )}
      </div>

      {/* Short description */}
      {product.shortDescription && (
        <p className="text-gray-600 leading-relaxed">{product.shortDescription}</p>
      )}

      {/* Variants */}
      {Object.entries(variantGroups).map(([type, variants]) => (
        <div key={type}>
          <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">
            {type}: {selectedVariant?.type === type ? <span className="text-brand-blue-mid">{selectedVariant.value}</span> : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                disabled={v.stock === 0}
                onClick={() => setSelectedVariant(v.id === selectedVariant?.id ? null : v)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                  v.id === selectedVariant?.id
                    ? "border-brand-blue-mid bg-brand-blue-subtle text-brand-blue-mid"
                    : "border-gray-200 hover:border-gray-300 text-gray-700",
                  v.stock === 0 && "opacity-40 cursor-not-allowed line-through"
                )}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Stock */}
      <p className={cn("text-sm font-medium", stockColor)}>{stockLabel}</p>

      {/* Quantity */}
      {stock > 0 && (
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold text-gray-700">Cantidad:</p>
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-4 py-2 hover:bg-gray-50 transition-colors text-gray-600 font-medium"
            >
              −
            </button>
            <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(stock, quantity + 1))}
              className="px-4 py-2 hover:bg-gray-50 transition-colors text-gray-600 font-medium"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          size="lg"
          className="flex-1 rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover text-white gap-2 h-14 text-base font-semibold"
          disabled={stock === 0}
          onClick={handleAddToCart}
        >
          {added ? (
            <><Check className="w-5 h-5" /> Agregado</>
          ) : (
            <><ShoppingCart className="w-5 h-5" /> {stock === 0 ? "Sin stock" : "Agregar al carrito"}</>
          )}
        </Button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-green-200 bg-green-50 text-green-700 font-semibold hover:bg-green-100 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          Consultar
        </a>

        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Compartir por WhatsApp"
          className="flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Share2 className="w-5 h-5 text-gray-500" />
        </a>
      </div>

      {/* Guarantees */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { icon: Shield, label: product.warranty ?? "Garantía oficial" },
          { icon: Truck, label: "Envío a todo el país" },
          { icon: RefreshCcw, label: "Cambios y devoluciones" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-2xl text-center">
            <Icon className="w-5 h-5 text-brand-blue-mid" />
            <span className="text-xs text-gray-600 leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Description */}
      {product.description && (
        <div className="pt-4 border-t border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Descripción</h2>
          <div
            className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </div>
      )}
    </div>
  );
}
