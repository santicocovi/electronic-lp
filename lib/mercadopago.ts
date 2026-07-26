import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export const preference = new Preference(client);
export const payment = new Payment(client);

interface CreatePreferenceItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  picture_url?: string;
}

interface CreatePreferenceOptions {
  orderId: string;
  items: CreatePreferenceItem[];
  payer: {
    name: string;
    surname: string;
    email: string;
    phone?: string;
  };
  shippingCost: number;
  discount: number;
  couponCode?: string;
}

export async function createCheckoutPreference(opts: CreatePreferenceOptions) {
  const BASE = process.env.NEXT_PUBLIC_APP_URL!;

  const body = {
    items: opts.items.map((item) => ({
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency_id: "ARS",
      picture_url: item.picture_url,
    })),
    payer: {
      name: opts.payer.name,
      surname: opts.payer.surname,
      email: opts.payer.email,
      phone: opts.payer.phone ? { number: opts.payer.phone } : undefined,
    },
    shipments: {
      cost: opts.shippingCost,
      mode: "not_specified" as const,
    },
    ...(opts.discount > 0 && {
      coupon_amount: opts.discount,
      coupon_code: opts.couponCode,
    }),
    back_urls: {
      success: `${BASE}/checkout/success?order_id=${opts.orderId}`,
      failure: `${BASE}/checkout/failure?order_id=${opts.orderId}`,
      pending: `${BASE}/checkout/pending?order_id=${opts.orderId}`,
    },
    auto_return: "approved" as const,
    external_reference: opts.orderId,
    notification_url: `${BASE}/api/webhook/mercadopago`,
    statement_descriptor: "ELECTRONIC LP",
  };

  return preference.create({ body });
}

export async function getPaymentById(paymentId: string) {
  return payment.get({ id: paymentId });
}
