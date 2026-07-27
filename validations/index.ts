import { z } from "zod";

const optionalNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : val),
  z.coerce.number().optional()
);

// ─── AUTH ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// ─── ADDRESS ─────────────────────────────────────────────────

export const addressSchema = z.object({
  label: z.string().min(1, "El nombre es requerido"),
  firstName: z.string().min(2, "El nombre es requerido"),
  lastName: z.string().min(2, "El apellido es requerido"),
  street: z.string().min(3, "La calle es requerida"),
  number: z.string().min(1, "El número es requerido"),
  apartment: z.string().optional(),
  city: z.string().min(2, "La ciudad es requerida"),
  province: z.string().min(2, "La provincia es requerida"),
  postalCode: z.string().min(4, "El código postal es requerido"),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// ─── CHECKOUT ────────────────────────────────────────────────

export const checkoutSchema = z.object({
  firstName: z.string().min(2, "El nombre es requerido"),
  lastName: z.string().min(2, "El apellido es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "El teléfono es requerido"),
  street: z.string().min(3, "La calle es requerida"),
  number: z.string().min(1, "El número es requerido"),
  apartment: z.string().optional(),
  city: z.string().min(2, "La ciudad es requerida"),
  province: z.string().min(2, "La provincia es requerida"),
  postalCode: z.string().min(4, "El código postal es requerido"),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
  shippingMethodId: z.string().min(1, "El método de envío es requerido"),
});

// ─── CONTACT ─────────────────────────────────────────────────

export const contactSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  subject: z.string().min(3, "El asunto es requerido"),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
});

export const newsletterSchema = z.object({
  email: z.string().email("Email inválido"),
});

// ─── ADMIN – PRODUCT ─────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  slug: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  internalCode: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  comparePrice: optionalNumber,
  costPrice: optionalNumber,
  stock: z.coerce.number().int().min(0),
  lowStockAlert: z.coerce.number().int().min(0).default(5),
  weight: optionalNumber,
  warranty: z.string().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isOnSale: z.boolean().default(false),
  freeShipping: z.boolean().default(false),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  showInNav: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
});

export const brandSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  slug: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const couponSchema = z.object({
  code: z.string().min(3, "El código es requerido").toUpperCase(),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().positive("El valor debe ser mayor a 0"),
  minOrderAmount: optionalNumber,
  maxDiscount: optionalNumber,
  usageLimit: optionalNumber,
  perUserLimit: optionalNumber,
  isActive: z.boolean().default(true),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

// ─── TYPES ───────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type BrandInput = z.infer<typeof brandSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
