import Image from "next/image";
import { cn } from "@/lib/utils";
import { IMAGE_QUALITY_CARD } from "@/lib/media";
import { ProductIllustration } from "@/components/shop/product/product-illustration";

/**
 * Media de un producto: fotografía si la hay, ilustración de su familia si no.
 *
 * Antes, un producto sin imagen caía en `/images/placeholder.svg`, el mismo
 * dibujo gris para todo el catálogo. Ahora cada familia tiene su propia
 * composición (MacBook, iPhone, iPad, Watch, AirPods, consolas, monitores…),
 * así que una ficha sin foto sigue leyéndose como una tienda cuidada.
 *
 * `sizes` es obligatorio con `fill`: sin él Next descarga la imagen a ancho
 * completo de viewport en todos los breakpoints.
 */

interface ProductMediaProps {
  src?: string | null;
  alt: string;
  /** Datos para resolver la familia cuando no hay imagen. */
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  sizes: string;
  priority?: boolean;
  /**
   * Calidad de recompresión. Se declara siempre de forma explícita: el 75 por
   * defecto de `next/image` degrada visiblemente las fotos de producto.
   */
  quality?: number;
  /** Clases de la imagen (padding, object-fit, transiciones de hover). */
  className?: string;
  /** Clases de la ilustración, normalmente un padding mayor. */
  illustrationClassName?: string;
}

export function ProductMedia({
  src,
  alt,
  productName,
  categorySlug,
  categoryName,
  sizes,
  priority = false,
  quality = IMAGE_QUALITY_CARD,
  className,
  illustrationClassName,
}: ProductMediaProps) {
  const hasImage = Boolean(src && src.trim() && src !== "/images/placeholder.svg");

  if (!hasImage) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center p-8", illustrationClassName)}>
        <ProductIllustration
          productName={productName ?? alt}
          categorySlug={categorySlug}
          categoryName={categoryName}
          label={alt}
        />
      </div>
    );
  }

  return (
    <Image
      src={src as string}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      className={cn("object-contain", className)}
    />
  );
}
