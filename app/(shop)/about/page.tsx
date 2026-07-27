import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conocé Electronic LP, tu tienda de tecnología en La Plata.",
};

export default function AboutPage() {
  return (
    <LegalPage
      title="Nosotros"
      intro="Electronic LP es una tienda de tecnología con base en La Plata, Buenos Aires. Vendemos productos originales, con garantía y atención personalizada."
      sections={[
        {
          heading: "Quiénes somos",
          body: [
            "Somos un emprendimiento platense dedicado a la venta de electrónica y tecnología. Trabajamos con iPhone, MacBook, iPad, Apple Watch, AirPods, auriculares, parlantes, monitores, gaming y accesorios.",
            "Empezamos atendiendo por redes sociales y WhatsApp, y hoy sumamos esta tienda online para que puedas comprar de forma directa, simple y segura.",
          ],
        },
        {
          heading: "Productos originales",
          body: [
            "Todo lo que vendemos es 100% original. No trabajamos con réplicas ni productos de dudosa procedencia.",
            "Cada producto incluye su garantía correspondiente, que podés hacer valer escribiéndonos por cualquiera de nuestros canales.",
          ],
        },
        {
          heading: "Envíos a todo el país",
          body: [
            "Despachamos a domicilio en toda Argentina. Los tiempos de entrega dependen de la zona y del método de envío que elijas al finalizar la compra.",
            "En La Plata y alrededores también coordinamos entregas personalmente. Consultanos por WhatsApp para conocer las opciones disponibles.",
          ],
        },
        {
          heading: "Atención personalizada",
          body: [
            "Antes, durante y después de la compra podés escribirnos. Respondemos por WhatsApp, Instagram y email.",
            "Si tenés dudas sobre qué producto se adapta mejor a lo que necesitás, escribinos y te asesoramos sin compromiso.",
          ],
        },
        {
          heading: "Cómo contactarnos",
          body: [
            "WhatsApp: +54 9 221 435-8517.",
            "Instagram: @electronic.lp.",
            "Email: electroniclpok@gmail.com.",
          ],
        },
      ]}
    />
  );
}
