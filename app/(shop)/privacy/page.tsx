import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Electronic LP trata y protege tus datos personales.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Esta política explica qué datos personales recolectamos, para qué los usamos y qué derechos tenés sobre ellos."
      sections={[
        {
          heading: "Qué datos recolectamos",
          body: [
            "Datos que nos das al registrarte o comprar: nombre, email, teléfono y dirección de envío.",
            "Datos de tus pedidos: productos comprados, importes y estado del envío.",
            "Datos técnicos básicos de navegación, necesarios para que el sitio funcione correctamente.",
          ],
        },
        {
          heading: "Para qué los usamos",
          body: [
            "Para procesar tus pedidos, coordinar el envío y brindarte soporte.",
            "Para enviarte información sobre el estado de tu compra.",
            "Si te suscribiste a nuestro newsletter, para enviarte novedades y ofertas. Podés darte de baja cuando quieras.",
          ],
        },
        {
          heading: "Datos de pago",
          body: [
            "No almacenamos datos de tarjetas. Los pagos se procesan íntegramente a través de Mercado Pago, que aplica sus propias políticas de seguridad y privacidad.",
          ],
        },
        {
          heading: "Con quién los compartimos",
          body: [
            "Solo compartimos datos con quienes son necesarios para completar tu compra: la plataforma de pago y el prestador logístico que realiza la entrega.",
            "No vendemos ni cedemos tus datos personales a terceros con fines publicitarios.",
          ],
        },
        {
          heading: "Seguridad",
          body: [
            "Las contraseñas se almacenan cifradas: nadie, ni siquiera nosotros, puede leerlas.",
            "El sitio opera bajo conexión cifrada (HTTPS) para proteger la información que viaja entre tu dispositivo y nuestros servidores.",
          ],
        },
        {
          heading: "Tus derechos",
          body: [
            "Podés acceder, rectificar o solicitar la supresión de tus datos personales en cualquier momento escribiéndonos a electroniclpok@gmail.com.",
            "Desde tu cuenta también podés editar tus datos y direcciones cuando quieras.",
            "La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende las denuncias y reclamos por incumplimiento de las normas sobre protección de datos personales.",
          ],
        },
      ]}
    />
  );
}
