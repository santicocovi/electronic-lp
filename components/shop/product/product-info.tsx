"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag, MessageCircle, Share2, Check, ChevronRight,
  ShieldCheck, Truck, RotateCcw, Minus, Plus, Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import {
  calculateDiscount,
  getProductWhatsAppUrl,
  getShareWhatsAppUrl,
  getAppUrl,
  cn,
} from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { WishlistButton } from "@/components/shop/product/wishlist-button";
import type { ProductWithRelations, ProductVariantType } from "@/types";

/**
 * Ficha de producto.
 *
 * Criterio visual: jerarquía por tipografía y espacio, no por color. Paleta
 * neutra, un único acento, sin sombras marcadas ni badges saturados. La
 * información técnica se lee de arriba hacia abajo: qué es, cuánto sale, en qué
 * variante, si hay stock, y recién entonces la acción.
 */

interface ProductInfoProps {
  product: ProductWithRelations;
  isSaved?: boolean;
  /** Cotización del dólar para mostrar el precio de referencia en pesos. */
  exchangeRate: number;
  baseCurrency: "USD" | "ARS";
  /** Recargo del pago en pesos efectivo, para el precio de referencia. */
  arsSurchargePercent: number;
}

export function ProductInfo({
  product,
  isSaved = false,
  exchangeRate,
  baseCurrency,
  arsSurchargePercent,
}: ProductInfoProps) {
  const addItem = useCartStore((s) => s.addItem);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariantType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const price = selectedVariant?.price ?? product.price;
  const stock = selectedVariant?.stock ?? product.stock;
  const discount = calculateDiscount(product.comparePrice, price);

  const mainImage =
    product.images.find((i) => i.isMain)?.url ??
    product.images[0]?.url ??
    "/images/placeholder.svg";

  const variantGroups = useMemo(
    () =>
      product.variants.reduce<Record<string, ProductVariantType[]>>((acc, v) => {
        (acc[v.type] ??= []).push(v);
        return acc;
      }, {}),
    [product.variants]
  );

  const fmtBase = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: baseCurrency,
      minimumFractionDigits: baseCurrency === "ARS" ? 0 : 2,
      maximumFractionDigits: baseCurrency === "ARS" ? 0 : 2,
    }).format(value);

  // Referencia en pesos: solo tiene sentido si la moneda base es el dólar.
  const arsReference =
    baseCurrency === "USD"
      ? Math.round(price * (1 + arsSurchargePercent / 100) * exchangeRate)
      : null;

  // La descripción se sanea antes de inyectarla como HTML.
  const safeDescription = useMemo(
    () => sanitizeHtml(product.description),
    [product.description]
  );

  const stockState =
    stock <= 0
      ? { label: "Sin stock", tone: "text-gray-400" }
      : stock <= 3
        ? { label: `Últimas ${stock} ${stock === 1 ? "unidad" : "unidades"}`, tone: "text-amber-600" }
        : { label: "En stock · listo para enviar", tone: "text-emerald-600" };

  function handleAddToCart() {
    if (stock <= 0) return;

    addItem({
      id: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price,
      image: selectedVariant?.image ?? mainImage,
      quantity,
      stock,
      variantName: selectedVariant
        ? `${selectedVariant.name}: ${selectedVariant.value}`
        : undefined,
    });

    setAdded(true);
    toast.add({ title: "Agregado al carrito", description: product.name });
    setTimeout(() => setAdded(false), 2000);
  }

  const whatsappUrl = getProductWhatsAppUrl(
    `${product.name}${selectedVariant ? ` – ${selectedVariant.value}` : ""}`
  );
  const shareUrl = getShareWhatsAppUrl(
    product.name,
    `${getAppUrl()}/products/${product.slug}`
  );

  return (
    <div className="lg:pt-2">
      {/* Ruta */}
      <nav aria-label="Ubicación" className="flex items-center gap-1 text-[13px] text-gray-400">
        {product.category && (
          <>
            <Link
              href={`/categories/${product.category.slug}`}
              className="transition-colors hover:text-gray-900"
            >
              {product.category.name}
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </>
        )}
        {product.brand && (
          <Link
            href={`/products?brand=${product.brand.slug}`}
            className="transition-colors hover:text-gray-900"
          >
            {product.brand.name}
          </Link>
        )}
      </nav>

      {/* Título */}
      <header className="mt-4">
        {(product.isNew || product.isOnSale) && (
          <p className="mb-2 text-[13px] font-medium tracking-wide text-brand-blue-mid">
            {product.isNew ? "Nuevo" : "Oferta"}
          </p>
        )}

        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-gray-900 sm:text-[40px]">
          {product.name}
        </h1>

        {product.shortDescription && (
          <p className="mt-3 text-[17px] leading-relaxed text-gray-500">
            {product.shortDescription}
          </p>
        )}
      </header>

      {/* Precio */}
      <div className="mt-7 border-t border-gray-100 pt-7">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[30px] font-semibold tracking-[-0.01em] text-gray-900">
            {fmtBase(price)}
          </span>

          {product.comparePrice && product.comparePrice > price && (
            <>
              <span className="text-[17px] text-gray-400 line-through">
                {fmtBase(product.comparePrice)}
              </span>
              {discount > 0 && (
                <span className="text-[15px] font-medium text-emerald-600">
                  {discount}% menos
                </span>
              )}
            </>
          )}
        </div>

        {arsReference !== null && (
          <p className="mt-1.5 text-[13px] text-gray-400">
            Referencia en pesos:{" "}
            <span className="text-gray-600">
              {new Intl.NumberFormat("es-AR", {
                style: "currency",
                currency: "ARS",
                maximumFractionDigits: 0,
              }).format(arsReference)}
            </span>
            {arsSurchargePercent > 0 && ` · dólar blue + ${arsSurchargePercent}%`}
          </p>
        )}

        {product.sku && (
          <p className="mt-3 font-mono text-[12px] text-gray-300">SKU {product.sku}</p>
        )}
      </div>

      {/* Variantes */}
      {Object.entries(variantGroups).map(([type, variants]) => (
        <fieldset key={type} className="mt-7 border-t border-gray-100 pt-7">
          <legend className="sr-only">Elegir {type}</legend>

          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[15px] font-medium capitalize text-gray-900">{type}</p>
            {selectedVariant?.type === type && (
              <p className="text-[13px] text-gray-500">{selectedVariant.value}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const isSelected = v.id === selectedVariant?.id;
              const soldOut = v.stock <= 0;

              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={soldOut}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVariant(isSelected ? null : v)}
                  className={cn(
                    "min-w-[68px] rounded-xl px-4 py-2.5 text-[14px] font-medium transition-all duration-200",
                    "ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900",
                    isSelected
                      ? "bg-gray-900 text-white ring-gray-900"
                      : "bg-white text-gray-700 ring-gray-200 hover:ring-gray-400",
                    soldOut && "cursor-not-allowed text-gray-300 ring-gray-100 hover:ring-gray-100"
                  )}
                >
                  {v.value}
                  {soldOut && <span className="ml-1.5 text-[11px]">agotado</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* Stock */}
      <p className={cn("mt-7 flex items-center gap-2 text-[14px] font-medium", stockState.tone)}>
        <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
        {stockState.label}
      </p>

      {/* Cantidad + acciones */}
      <div className="mt-5 space-y-3">
        {stock > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-[14px] text-gray-500">Cantidad</span>
            <div className="flex items-center rounded-xl ring-1 ring-gray-200">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Quitar una unidad"
                className="flex h-10 w-10 items-center justify-center rounded-l-xl text-gray-500 transition-colors hover:bg-gray-50 disabled:text-gray-200"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span
                aria-live="polite"
                className="min-w-[2.5rem] text-center text-[15px] font-medium text-gray-900"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                disabled={quantity >= stock}
                aria-label="Agregar una unidad"
                className="flex h-10 w-10 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:bg-gray-50 disabled:text-gray-200"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <Button
          size="lg"
          disabled={stock <= 0}
          onClick={handleAddToCart}
          className="h-[52px] w-full gap-2 rounded-2xl bg-brand-blue-mid text-[16px] font-medium text-white transition-colors hover:bg-brand-blue-hover disabled:bg-gray-100 disabled:text-gray-400"
        >
          {added ? (
            <><Check className="h-4 w-4" aria-hidden="true" /> Agregado</>
          ) : stock <= 0 ? (
            "Sin stock"
          ) : (
            <><ShoppingBag className="h-4 w-4" aria-hidden="true" /> Agregar al carrito</>
          )}
        </Button>

        <div className="flex gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-medium text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Consultar
          </a>

          <WishlistButton
            productId={product.id}
            initialSaved={isSaved}
            className="h-[52px] w-[52px] shrink-0 rounded-2xl ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
          />

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir por WhatsApp"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Garantías */}
      <ul className="mt-8 space-y-3 border-t border-gray-100 pt-7">
        {[
          { icon: Truck, text: "Envíos dentro de La Plata durante el día y sin cargo." },
          { icon: ShieldCheck, text: product.warranty ?? "Garantía oficial incluida." },
          { icon: RotateCcw, text: "Cambios y devoluciones coordinados con el vendedor." },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[14px] leading-relaxed text-gray-600">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>

      {/* Descripción */}
      {safeDescription && (
        <section className="mt-8 border-t border-gray-100 pt-7">
          <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-gray-900">
            Sobre este producto
          </h2>
          <div
            className="prose prose-sm max-w-none text-[15px] leading-relaxed text-gray-600 prose-headings:text-gray-900 prose-a:text-brand-blue-mid"
            dangerouslySetInnerHTML={{ __html: safeDescription }}
          />
        </section>
      )}
    </div>
  );
}
