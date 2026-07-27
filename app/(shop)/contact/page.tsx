import type { Metadata } from "next";
import { MessageCircle, Instagram, Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/shop/contact-form";
import { ShippingNotice } from "@/components/shop/shipping-notice";
import { getCurrentUser } from "@/lib/auth-guard";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribinos por WhatsApp, Instagram o email. Envíos sin cargo dentro de La Plata durante el día.",
};

export default async function ContactPage() {
  // El formulario se precarga con los datos del usuario logueado, así el mensaje
  // llega asociado al correo con el que se registró.
  const [user, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);

  const contactChannels = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "+54 9 221 435-8517",
      href: `https://wa.me/${settings.whatsapp}`,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: "@electronic.lp",
      href: settings.instagram,
      accent: "text-pink-600 bg-pink-50",
    },
    {
      icon: Mail,
      label: "Email",
      value: settings.email,
      href: `mailto:${settings.email}`,
      accent: "text-brand-blue-mid bg-brand-blue-subtle",
    },
  ];

  return (
    <div className="pt-24 min-h-screen">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <header className="text-center mb-14">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">Contacto</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Estamos para ayudarte. Escribinos y te respondemos lo antes posible.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Medios de contacto</h2>

            <div className="space-y-4">
              {contactChannels.map((channel) => (
                <a
                  key={channel.label}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all"
                >
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${channel.accent}`}>
                    <channel.icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs text-gray-400 font-medium">{channel.label}</span>
                    <span className="block font-semibold text-gray-900">{channel.value}</span>
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl border border-gray-100 bg-gray-50/60">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-gray-900">Zona de cobertura</p>
                <p className="text-sm text-gray-500 mt-0.5">{settings.address}</p>
              </div>
            </div>

            <div className="mt-6">
              <ShippingNotice variant="inline" />
            </div>
          </div>

          <ContactForm
            defaultName={user?.name ?? undefined}
            defaultEmail={user?.email}
          />
        </div>
      </div>
    </div>
  );
}
