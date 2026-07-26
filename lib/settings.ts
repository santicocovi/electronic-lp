import { db } from "@/lib/db";
import { SiteSettings } from "@/types";

const DEFAULTS: SiteSettings = {
  storeName: "Electronic LP",
  storeDescription: "Tu tienda de electrónica premium en La Plata",
  storeLogo: "/images/logo.png",
  storeFavicon: "/favicon.ico",
  heroVideoUrl: "/videos/hero.mp4",
  heroTitle: "Tecnología que inspira",
  heroSubtitle: "iPhone, MacBook, iPad, AirPods y mucho más. Envíos a todo el país.",
  heroCta: "Explorar productos",
  email: "electroniclpok@gmail.com",
  whatsapp: "5492214358517",
  instagram: "https://instagram.com/electronic.lp",
  facebook: "",
  twitter: "",
  address: "La Plata, Buenos Aires, Argentina",
  currency: "ARS",
  currencySymbol: "$",
  taxRate: 0,
  freeShippingFrom: 100000,
  metaTitle: "Electronic LP – Electrónica premium en La Plata",
  metaDescription: "iPhone, MacBook, iPad, AirPods, auriculares, gaming y más. Envíos a todo el país.",
  metaKeywords: "iphone, macbook, ipad, airpods, electronica, la plata",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const records = await db.siteSetting.findMany();
    const map: Record<string, string> = {};
    records.forEach((r) => { map[r.key] = r.value; });

    return {
      storeName: map.storeName ?? DEFAULTS.storeName,
      storeDescription: map.storeDescription ?? DEFAULTS.storeDescription,
      storeLogo: map.storeLogo ?? DEFAULTS.storeLogo,
      storeFavicon: map.storeFavicon ?? DEFAULTS.storeFavicon,
      heroVideoUrl: map.heroVideoUrl ?? DEFAULTS.heroVideoUrl,
      heroTitle: map.heroTitle ?? DEFAULTS.heroTitle,
      heroSubtitle: map.heroSubtitle ?? DEFAULTS.heroSubtitle,
      heroCta: map.heroCta ?? DEFAULTS.heroCta,
      email: map.email ?? DEFAULTS.email,
      whatsapp: map.whatsapp ?? DEFAULTS.whatsapp,
      instagram: map.instagram ?? DEFAULTS.instagram,
      facebook: map.facebook ?? DEFAULTS.facebook,
      twitter: map.twitter ?? DEFAULTS.twitter,
      address: map.address ?? DEFAULTS.address,
      currency: map.currency ?? DEFAULTS.currency,
      currencySymbol: map.currencySymbol ?? DEFAULTS.currencySymbol,
      taxRate: parseFloat(map.taxRate ?? "0"),
      freeShippingFrom: parseFloat(map.freeShippingFrom ?? "100000"),
      metaTitle: map.metaTitle ?? DEFAULTS.metaTitle,
      metaDescription: map.metaDescription ?? DEFAULTS.metaDescription,
      metaKeywords: map.metaKeywords ?? DEFAULTS.metaKeywords,
    };
  } catch {
    return DEFAULTS;
  }
}

export async function updateSiteSetting(key: string, value: string, group = "general") {
  return db.siteSetting.upsert({
    where: { key },
    create: { key, value, group },
    update: { value },
  });
}

export async function updateManySettings(settings: Record<string, string>, group = "general") {
  const ops = Object.entries(settings).map(([key, value]) =>
    db.siteSetting.upsert({
      where: { key },
      create: { key, value, group },
      update: { value },
    })
  );
  return Promise.all(ops);
}
