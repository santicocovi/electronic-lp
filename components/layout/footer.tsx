import Link from "next/link";
import { Instagram, Mail, MessageCircle, MapPin, Truck } from "lucide-react";
import { db } from "@/lib/db";

const INFO = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/about" },
  { label: "Contacto", href: "/contact" },
  { label: "Preguntas frecuentes", href: "/#faq" },
  { label: "Términos y condiciones", href: "/terms" },
  { label: "Política de privacidad", href: "/privacy" },
];

export async function Footer() {
  // Las categorías salen de la base: antes estaban escritas a mano y una
  // categoría nueva del panel nunca aparecía acá.
  const categories = await db.category
    .findMany({
      where: { isActive: true, showInNav: true, parentId: null },
      orderBy: { order: "asc" },
      select: { id: true, name: true, slug: true },
      take: 8,
    })
    .catch(() => []);

  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <p className="text-white text-xl font-bold tracking-tight mb-3">
              Electronic <span className="text-brand-blue-light">LP</span>
            </p>
            <p className="text-sm leading-relaxed mb-6">
              Tu tienda de tecnología premium en La Plata. Los mejores productos, la mejor atención.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://instagram.com/electronic.lp"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-blue-mid flex items-center justify-center transition-colors"
              >
                <Instagram className="w-4 h-4 text-white" />
              </a>
              <a
                href="mailto:electroniclpok@gmail.com"
                aria-label="Email"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-brand-blue-mid flex items-center justify-center transition-colors"
              >
                <Mail className="w-4 h-4 text-white" />
              </a>
              <a
                href="https://wa.me/5492214358517"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <p className="text-white font-semibold mb-4">Categorías</p>
            <ul className="space-y-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/categories/${c.slug}`}
                    className="text-sm hover:text-brand-blue-light transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/products"
                  className="text-sm text-gray-500 hover:text-brand-blue-light transition-colors"
                >
                  Ver todo
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <p className="text-white font-semibold mb-4">Información</p>
            <ul className="space-y-2">
              {INFO.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className="text-sm hover:text-brand-blue-light transition-colors"
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white font-semibold mb-4">Contacto</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-brand-blue-light mt-0.5 flex-shrink-0" />
                La Plata, Buenos Aires, Argentina
              </li>
              <li>
                <a
                  href="mailto:electroniclpok@gmail.com"
                  className="flex items-center gap-3 text-sm hover:text-brand-blue-light transition-colors"
                >
                  <Mail className="w-4 h-4 text-brand-blue-light" />
                  electroniclpok@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5492214358517"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-green-400 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  +54 9 221 435-8517
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/electronic.lp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-brand-blue-light transition-colors"
                >
                  <Instagram className="w-4 h-4 text-brand-blue-light" />
                  @electronic.lp
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Envíos */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="flex items-center justify-center gap-2 text-sm text-gray-300">
            <Truck className="w-4 h-4 text-brand-blue-light shrink-0" aria-hidden="true" />
            Envíos dentro de La Plata durante el día y sin cargo.
          </p>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-5 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Electronic LP. Todos los derechos reservados.</p>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG local estático, no necesita optimización */}
            <img src="/images/mp-badge.svg" alt="Mercado Pago" className="h-5 opacity-50" />

            {/* Firma del desarrollo */}
            <p className="text-gray-600">
              Developed by{" "}
              <span className="text-gray-500 transition-colors hover:text-gray-400">
                Santiago Cocovi
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
