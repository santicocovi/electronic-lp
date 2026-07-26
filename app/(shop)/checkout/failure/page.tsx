import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutFailurePage() {
  return (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center px-4 max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Pago rechazado</h1>
        <p className="text-gray-500 mb-8">El pago no pudo procesarse. Podés intentar nuevamente con otro medio de pago.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/cart">
            <Button className="rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover">Volver al carrito</Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" className="rounded-2xl">Contactar soporte</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
