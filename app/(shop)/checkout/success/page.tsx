import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center px-4 max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">¡Pago exitoso!</h1>
        <p className="text-gray-500 mb-8">Tu pedido fue confirmado. Te enviaremos un email con los detalles.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile/orders">
            <Button className="rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover">Ver mis pedidos</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="rounded-2xl">Seguir comprando</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
