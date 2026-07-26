import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutPendingPage() {
  return (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center px-4 max-w-md">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Pago pendiente</h1>
        <p className="text-gray-500 mb-8">Tu pago está siendo procesado. Te avisaremos cuando se confirme.</p>
        <Link href="/profile/orders">
          <Button className="rounded-2xl bg-brand-blue-mid hover:bg-brand-blue-hover">Ver mis pedidos</Button>
        </Link>
      </div>
    </div>
  );
}
