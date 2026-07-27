import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un importe en la moneda base de la tienda.
 *
 * El default era "ARS", pero los precios de catálogo están en dólares, así que
 * todo el sitio mostraba "$ 1.200" para un producto de USD 1.200. Ahora el
 * default es USD, que es la moneda base real (ver el ajuste `base_currency`).
 * Para convertir a pesos se usa `convertForDisplay` de lib/pricing.
 */
export function formatPrice(price: number, currency = "USD"): string {
  const isArs = currency === "ARS"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: isArs ? 0 : 2,
    maximumFractionDigits: isArs ? 0 : 2,
  }).format(price)
}

export function calculateDiscount(originalPrice: number | null | undefined, salePrice: number): number {
  if (!originalPrice || originalPrice <= 0 || !salePrice) return 0
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100)
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ELP-${timestamp}-${random}`
}

export function getProductWhatsAppUrl(
  productName: string,
  productUrl = "",
  whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5492214358517"
): string {
  const message = encodeURIComponent(
    productUrl
      ? `Hola! Me interesa el producto: ${productName}\n${productUrl}`
      : `Hola! Me interesa el producto: ${productName}`
  )
  return `https://wa.me/${whatsappNumber}?text=${message}`
}

export function getShareWhatsAppUrl(
  productName: string,
  productUrl = ""
): string {
  const message = encodeURIComponent(
    `Mirá este producto de Electronic LP: ${productName}${productUrl ? `\n${productUrl}` : ""}`
  )
  return `https://wa.me/?text=${message}`
}

export function getStockLabel(stock: number): { label: string; color: string } {
  if (stock <= 0) return { label: "Sin stock", color: "text-red-500" }
  if (stock <= 5) return { label: `Últimas ${stock} unidades`, color: "text-orange-500" }
  return { label: "En stock", color: "text-green-500" }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return /^https?:\/\//.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`
}

export function absoluteUrl(path: string): string {
  return `${getAppUrl()}${path}`
}
