import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/*
 * `formatPrice` se eliminó a propósito.
 *
 * Tenía una moneda por defecto fija, así que cualquier llamada que olvidara
 * pasarla mostraba dólares aunque el importe estuviera en pesos —de ahí venían
 * las inconsistencias de moneda del panel y del historial de pedidos—. El único
 * formateador de dinero es ahora `formatMoney(amount, currency)` de
 * lib/pricing, que exige declarar la moneda de forma explícita.
 */

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

/*
 * Se eliminaron `generateOrderNumber`, `getStockLabel`, `truncate` y
 * `absoluteUrl`: no los importaba nadie. El número de pedido lo genera
 * `buildOrderNumber` en actions/orders (con alfabeto sin caracteres ambiguos y
 * reintento ante colisión), el estado de stock lo arma la ficha de producto, y
 * los recortes de texto se hacen con las utilidades de Tailwind.
 */

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

export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return /^https?:\/\//.test(raw) ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`
}
