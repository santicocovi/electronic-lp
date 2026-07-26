import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string, currency = "ARS"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
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
    .trim();
}

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ELP-${timestamp}-${random}`;
}

export function calculateDiscount(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

export function getWhatsAppUrl(phone: string, message?: string): string {
  const baseUrl = `https://wa.me/${phone}`;
  if (message) return `${baseUrl}?text=${encodeURIComponent(message)}`;
  return baseUrl;
}

export function getProductWhatsAppUrl(productName: string): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP ?? "5492214358517";
  const message = `Hola! Me interesa el producto: ${productName}. ¿Podrían darme más información?`;
  return getWhatsAppUrl(phone, message);
}

export function getShareWhatsAppUrl(productName: string, url: string): string {
  const message = `Mirá este producto en Electronic LP: ${productName}\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function getStockLabel(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: "Sin stock", color: "text-red-500" };
  if (stock <= 5) return { label: `Últimas ${stock} unidades`, color: "text-orange-500" };
  return { label: "En stock", color: "text-green-600" };
}

export function getOrderStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
    APPROVED: { label: "Aprobado", color: "bg-blue-100 text-blue-800" },
    PROCESSING: { label: "En proceso", color: "bg-purple-100 text-purple-800" },
    SHIPPED: { label: "Enviado", color: "bg-indigo-100 text-indigo-800" },
    DELIVERED: { label: "Entregado", color: "bg-green-100 text-green-800" },
    CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-800" },
    REFUNDED: { label: "Reembolsado", color: "bg-gray-100 text-gray-800" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
}

export function getPaymentStatusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
    APPROVED: { label: "Aprobado", color: "bg-green-100 text-green-800" },
    REJECTED: { label: "Rechazado", color: "bg-red-100 text-red-800" },
    IN_PROCESS: { label: "En proceso", color: "bg-blue-100 text-blue-800" },
    REFUNDED: { label: "Reembolsado", color: "bg-gray-100 text-gray-800" },
  };
  return map[status] ?? { label: status, color: "bg-gray-100 text-gray-800" };
}

export function buildWhatsAppProductMessage(name: string, url: string): string {
  return `Hola! Me interesa el producto *${name}*.\n\nLink: ${url}\n\n¿Tienen stock disponible?`;
}
