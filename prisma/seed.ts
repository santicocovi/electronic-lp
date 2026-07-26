/**
 * Electronic LP – Prisma Seed
 * Ejecutar con: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Admin User ─────────────────────────────────────────────
  const adminEmail = "admin@electroniclp.com";
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin123!", 12);
    await db.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        password: hashedPassword,
        role: "SUPERADMIN",
        emailVerified: new Date(),
      },
    });
    console.log("✅ Admin creado: admin@electroniclp.com / Admin123!");
  }

  // ─── Categories ─────────────────────────────────────────────
  const categories = [
    { name: "iPhone", slug: "iphone", icon: "📱", order: 1 },
    { name: "MacBook", slug: "macbook", icon: "💻", order: 2 },
    { name: "iPad", slug: "ipad", icon: "⬜", order: 3 },
    { name: "Apple Watch", slug: "apple-watch", icon: "⌚", order: 4 },
    { name: "AirPods", slug: "airpods", icon: "🎧", order: 5 },
    { name: "Auriculares", slug: "auriculares", icon: "🎧", order: 6 },
    { name: "Parlantes", slug: "parlantes", icon: "🔊", order: 7 },
    { name: "Monitores", slug: "monitores", icon: "🖥️", order: 8 },
    { name: "Gaming", slug: "gaming", icon: "🎮", order: 9 },
    { name: "Smart Home", slug: "smart-home", icon: "🏠", order: 10 },
    { name: "Accesorios", slug: "accesorios", icon: "🔌", order: 11 },
  ];

  for (const cat of categories) {
    await db.category.upsert({
      where: { slug: cat.slug },
      create: { ...cat, isActive: true, showInNav: true },
      update: { ...cat },
    });
  }
  console.log("✅ Categorías creadas");

  // ─── Brands ─────────────────────────────────────────────────
  const brands = [
    { name: "Apple", slug: "apple", order: 1 },
    { name: "Samsung", slug: "samsung", order: 2 },
    { name: "Sony", slug: "sony", order: 3 },
    { name: "JBL", slug: "jbl", order: 4 },
    { name: "Xiaomi", slug: "xiaomi", order: 5 },
    { name: "Anker", slug: "anker", order: 6 },
    { name: "Logitech", slug: "logitech", order: 7 },
    { name: "Nothing", slug: "nothing", order: 8 },
  ];

  for (const brand of brands) {
    await db.brand.upsert({
      where: { slug: brand.slug },
      create: { ...brand, isActive: true },
      update: { ...brand },
    });
  }
  console.log("✅ Marcas creadas");

  // ─── Shipping Methods ────────────────────────────────────────
  await db.shippingMethod.upsert({
    where: { id: "shipping-correo" },
    create: {
      id: "shipping-correo",
      name: "Correo Argentino",
      description: "Envío estándar a domicilio",
      price: 4500,
      estimatedDays: "3-7 días hábiles",
      order: 1,
    },
    update: {},
  });

  await db.shippingMethod.upsert({
    where: { id: "shipping-andreani" },
    create: {
      id: "shipping-andreani",
      name: "Andreani",
      description: "Envío rápido con seguimiento en tiempo real",
      price: 6500,
      estimatedDays: "2-4 días hábiles",
      order: 2,
    },
    update: {},
  });

  await db.shippingMethod.upsert({
    where: { id: "shipping-local" },
    create: {
      id: "shipping-local",
      name: "Retiro en La Plata",
      description: "Coordinamos punto de entrega en La Plata",
      price: 0,
      estimatedDays: "24-48 horas",
      order: 3,
    },
    update: {},
  });
  console.log("✅ Métodos de envío creados");

  // ─── FAQs ────────────────────────────────────────────────────
  const faqs = [
    { question: "¿Los productos tienen garantía?", answer: "Sí, todos nuestros productos son 100% originales y cuentan con garantía oficial de fábrica.", order: 1 },
    { question: "¿Hacen envíos a todo el país?", answer: "Sí, enviamos a todo Argentina vía Correo Argentino o Andreani. También hay opción de retiro en La Plata.", order: 2 },
    { question: "¿Cómo puedo pagar?", answer: "Aceptamos todos los medios de pago disponibles en Mercado Pago: tarjeta de crédito, débito, transferencia y efectivo.", order: 3 },
    { question: "¿Puedo hacer una consulta antes de comprar?", answer: "¡Por supuesto! Escribinos por WhatsApp al +54 9 221 435-8517 o por Instagram @electronic.lp y te respondemos a la brevedad.", order: 4 },
    { question: "¿Qué pasa si el producto llega dañado?", answer: "En caso de recibir un producto con algún problema, escribinos de inmediato. Lo solucionamos sin costo con cambio o devolución.", order: 5 },
    { question: "¿Tienen stock permanente?", answer: "Trabajamos con stock actualizado. Si un producto no tiene stock disponible lo indicamos claramente en la tienda.", order: 6 },
  ];

  for (const faq of faqs) {
    const existing = await db.fAQ.findFirst({ where: { question: faq.question } });
    if (!existing) {
      await db.fAQ.create({ data: { ...faq, isActive: true } });
    }
  }
  console.log("✅ FAQs creados");

  // ─── Testimonials ────────────────────────────────────────────
  const testimonials = [
    { name: "Lucía M.", rating: 5, body: "Compré un iPhone y llegó perfecto, en excelente estado y con garantía. La atención fue muy buena, siempre respondieron rápido.", product: "iPhone 15", order: 1 },
    { name: "Matías R.", rating: 5, body: "Excelente servicio. Los AirPods llegaron en 3 días y son 100% originales. Sin dudas voy a volver a comprar.", product: "AirPods Pro", order: 2 },
    { name: "Carolina T.", rating: 5, body: "La mejor experiencia de compra online. Todo muy claro, el pago fue simple y el envío llegó antes de lo esperado.", product: "Apple Watch", order: 3 },
    { name: "Diego F.", rating: 5, body: "Compré una MacBook y estoy muy satisfecho. Precio muy competitivo y la atención personalizada por WhatsApp fue clave.", product: "MacBook Air M2", order: 4 },
    { name: "Valentina S.", rating: 5, body: "Muy buena tienda. Tienen todo lo que buscás en electrónica y los precios son muy buenos comparado con otras tiendas.", order: 5 },
    { name: "Tomás G.", rating: 5, body: "Primera vez que compro y quedé muy conforme. Rápido, seguro y sin complicaciones. Lo recomiendo a todos.", product: "iPad", order: 6 },
  ];

  for (const t of testimonials) {
    const existing = await db.testimonial.findFirst({ where: { name: t.name } });
    if (!existing) {
      await db.testimonial.create({ data: { ...t, isApproved: true } });
    }
  }
  console.log("✅ Testimonios creados");

  // ─── Site Settings ───────────────────────────────────────────
  const settings = [
    { key: "storeName", value: "Electronic LP", group: "general" },
    { key: "storeDescription", value: "Tu tienda de electrónica premium en La Plata", group: "general" },
    { key: "heroTitle", value: "Tecnología que inspira", group: "hero" },
    { key: "heroSubtitle", value: "iPhone, MacBook, iPad, AirPods y mucho más. Envíos a todo el país.", group: "hero" },
    { key: "heroVideoUrl", value: "/videos/hero.mp4", group: "hero" },
    { key: "heroCta", value: "Explorar productos", group: "hero" },
    { key: "email", value: "electroniclpok@gmail.com", group: "contact" },
    { key: "whatsapp", value: "5492214358517", group: "contact" },
    { key: "instagram", value: "https://instagram.com/electronic.lp", group: "contact" },
    { key: "currency", value: "ARS", group: "general" },
    { key: "currencySymbol", value: "$", group: "general" },
    { key: "freeShippingFrom", value: "150000", group: "shipping" },
    { key: "metaTitle", value: "Electronic LP – Electrónica premium en La Plata", group: "seo" },
    { key: "metaDescription", value: "iPhone, MacBook, iPad, AirPods, auriculares, gaming y más. Envíos a todo el país.", group: "seo" },
  ];

  for (const s of settings) {
    await db.siteSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }
  console.log("✅ Configuración del sitio creada");

  console.log("\n🎉 Seed completado exitosamente!");
  console.log("\n📋 Datos del admin:");
  console.log("   Email: admin@electroniclp.com");
  console.log("   Password: Admin123!");
  console.log("\n⚠️  Cambiá la contraseña del admin después de ingresar por primera vez.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
