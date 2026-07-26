"use server";

import { db } from "@/lib/db";
import { createCheckoutPreference } from "@/lib/mercadopago";
import { sendOrderConfirmation } from "@/lib/mail";
import { generateOrderNumber, formatPrice } from "@/lib/utils";
import type { ActionResult } from "@/types";

interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface ShippingInfo {
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
}

interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  shipping: ShippingInfo;
  shippingMethodId: string;
  shippingCost: number;
  couponCode?: string;
  couponDiscount: number;
  notes?: string;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<{ orderId: string; preferenceUrl: string }>> {
  try {
    const subtotal = input.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const total = subtotal + input.shippingCost - input.couponDiscount;
    const orderNumber = generateOrderNumber();

    // Get coupon if provided
    let couponId: string | undefined;
    if (input.couponCode) {
      const coupon = await db.coupon.findUnique({ where: { code: input.couponCode, isActive: true } });
      if (coupon) couponId = coupon.id;
    }

    // Create order
    const order = await db.order.create({
      data: {
        userId: input.userId,
        orderNumber,
        subtotal,
        shippingCost: input.shippingCost,
        discount: input.couponDiscount,
        total,
        couponId,
        couponCode: input.couponCode,
        notes: input.notes,
        shippingName: `${input.shipping.firstName} ${input.shipping.lastName}`,
        shippingStreet: input.shipping.street,
        shippingCity: input.shipping.city,
        shippingProvince: input.shipping.province,
        shippingPostal: input.shipping.postalCode,
        shippingPhone: input.shipping.phone,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        },
      },
    });

    // Create MercadoPago preference
    const mpResult = await createCheckoutPreference({
      orderId: order.id,
      items: input.items.map((i) => ({
        id: i.productId,
        title: i.name.substring(0, 256),
        quantity: i.quantity,
        unit_price: i.price,
        picture_url: i.image,
      })),
      payer: {
        name: input.shipping.firstName,
        surname: input.shipping.lastName,
        email: input.shipping.email,
        phone: input.shipping.phone,
      },
      shippingCost: input.shippingCost,
      discount: input.couponDiscount,
      couponCode: input.couponCode,
    });

    // Update order with preference ID
    await db.order.update({
      where: { id: order.id },
      data: { preferenceId: mpResult.id },
    });

    // Increment coupon usage
    if (couponId) {
      db.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } }).catch(() => {});
    }

    // Reduce stock
    for (const item of input.items) {
      if (item.variantId) {
        db.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        }).catch(() => {});
      } else {
        db.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity }, salesCount: { increment: item.quantity } },
        }).catch(() => {});
      }
    }

    // Send confirmation email (fire & forget)
    sendOrderConfirmation(
      input.shipping.email,
      orderNumber,
      formatPrice(total),
      input.items.map((i) => ({ name: i.name, quantity: i.quantity, price: formatPrice(i.price * i.quantity) }))
    ).catch(() => {});

    return {
      success: true,
      data: {
        orderId: order.id,
        preferenceUrl: mpResult.init_point!,
      },
    };
  } catch (error) {
    console.error("createOrder error:", error);
    return { success: false, error: "Error al crear el pedido. Intentá nuevamente." };
  }
}
