import type { Metadata } from "next";
import { LegalPage } from "@/components/shop/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso y compra en Electronic LP.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro="Estos términos regulan el uso del sitio y las compras realizadas en Electronic LP. Al comprar, aceptás las condiciones detalladas a continuación."
      sections={[
        {
          heading: "1. Sobre la tienda",
          body: [
            "Electronic LP comercializa productos de electrónica y tecnología a través de este sitio y de sus canales de atención, con domicilio comercial en La Plata, provincia de Buenos Aires, Argentina.",
          ],
        },
        {
          heading: "2. Precios y disponibilidad",
          body: [
            "Los precios están expresados en pesos argentinos e incluyen impuestos, salvo que se indique lo contrario. Pueden modificarse sin previo aviso.",
            "La publicación de un producto no garantiza su disponibilidad. Si un producto quedara sin stock luego de tu compra, nos comunicaremos para ofrecerte una alternativa o el reintegro total del importe abonado.",
          ],
        },
        {
          heading: "3. Compras y pagos",
          body: [
            "Los pagos se procesan a través de Mercado Pago. Electronic LP no almacena los datos de tu tarjeta: son gestionados directamente por la plataforma de pago.",
            "La compra se considera confirmada una vez que el pago es acreditado. Vas a recibir un email con el detalle de tu pedido.",
          ],
        },
        {
          heading: "4. Envíos",
          body: [
            "Realizamos envíos a todo el país. Los plazos son estimados y dependen del prestador logístico y de la zona de entrega.",
            "Es responsabilidad del comprador brindar una dirección de entrega correcta y completa. Los costos de un reenvío por datos erróneos corren por cuenta del comprador.",
          ],
        },
        {
          heading: "5. Garantía",
          body: [
            "Todos los productos cuentan con garantía. El plazo se informa en la ficha de cada producto.",
            "La garantía no cubre daños por mal uso, golpes, contacto con líquidos ni intervenciones realizadas por terceros no autorizados.",
          ],
        },
        {
          heading: "6. Cambios y devoluciones",
          body: [
            "Conforme a la Ley 24.240 de Defensa del Consumidor, podés arrepentirte de tu compra dentro de los 10 días corridos de recibido el producto, siempre que esté sin uso y en su empaque original.",
            "Para iniciar un cambio o devolución, escribinos por WhatsApp o email indicando tu número de pedido.",
          ],
        },
        {
          heading: "7. Cuentas de usuario",
          body: [
            "Sos responsable de mantener la confidencialidad de tu contraseña y de la actividad realizada desde tu cuenta.",
            "Podemos suspender cuentas ante usos fraudulentos o que afecten el funcionamiento del sitio.",
          ],
        },
        {
          heading: "8. Contacto",
          body: [
            "Ante cualquier consulta sobre estos términos, escribinos a electroniclpok@gmail.com o por WhatsApp al +54 9 221 435-8517.",
          ],
        },
      ]}
    />
  );
}
