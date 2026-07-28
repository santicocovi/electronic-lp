// ============================================================
// Electronic LP – Types
// ============================================================

export type { User, Product, Category, Brand, Order, OrderItem, CartItem, Address, Review } from "@prisma/client";

export interface ProductWithRelations {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  sku: string | null;
  /** Precio en la moneda base de la tienda. */
  price: number;
  comparePrice: number | null;
  /** Precio en pesos fijado por el administrador. null = conversión automática. */
  priceArs: number | null;
  comparePriceArs: number | null;
  stock: number;
  warranty: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isOnSale: boolean;
  freeShipping: boolean;
  salesCount: number;
  createdAt: Date;
  category: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string; slug: string; logo: string | null } | null;
  images: ProductImageType[];
  variants: ProductVariantType[];
  specs: ProductSpecType[];
  _count?: { reviews: number };
  avgRating?: number;
}

export interface ProductImageType {
  id: string;
  url: string;
  alt: string | null;
  order: number;
  isMain: boolean;
}

export interface ProductVariantType {
  id: string;
  name: string;
  value: string;
  type: string;
  price: number | null;
  stock: number;
  sku: string | null;
  image: string | null;
  isActive: boolean;
  order: number;
}

export interface ProductSpecType {
  id: string;
  group: string;
  label: string;
  value: string;
  order: number;
}

export interface CartItemWithProduct {
  id: string;
  quantity: number;
  product: ProductWithRelations;
  variant: ProductVariantType | null;
}

export interface OrderWithItems {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  couponCode: string | null;
  notes: string | null;
  createdAt: Date;
  items: OrderItemWithProduct[];
  address: AddressType | null;
}

export interface OrderItemWithProduct {
  id: string;
  name: string;
  image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  product: { slug: string };
  variant: ProductVariantType | null;
}

export interface AddressType {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  street: string;
  number: string;
  apartment: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  children: CategoryWithChildren[];
  _count?: { products: number };
}

export interface SiteSettings {
  storeName: string;
  storeDescription: string;
  storeLogo: string;
  storeFavicon: string;
  heroVideoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  email: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  twitter: string;
  address: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  freeShippingFrom: number;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  apartment?: string;
  city: string;
  province: string;
  postalCode: string;
  notes?: string;
  couponCode?: string;
  shippingMethodId: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  recentOrders: OrderWithItems[];
  topProducts: { product: ProductWithRelations; salesCount: number }[];
  lowStockProducts: ProductWithRelations[];
  salesByMonth: { month: string; total: number }[];
}

export interface FilterParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  isFeatured?: boolean;
  sortBy?: "price_asc" | "price_desc" | "newest" | "popular" | "name_asc";
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };
