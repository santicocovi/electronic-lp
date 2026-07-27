import { Truck, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aviso de envíos sin cargo en La Plata.
 * Se usa en la página principal, en la ficha de producto y en el checkout,
 * con tres densidades visuales distintas pero un mismo mensaje.
 */

const MESSAGE = "Envíos dentro de La Plata durante el día y sin cargo.";

interface ShippingNoticeProps {
  variant?: "banner" | "inline" | "compact";
  className?: string;
}

export function ShippingNotice({ variant = "inline", className }: ShippingNoticeProps) {
  if (variant === "compact") {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-gray-600", className)}>
        <Truck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>{MESSAGE}</span>
      </p>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3 py-4 px-6",
          "border-y border-gray-100 bg-gray-50/60",
          className
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Truck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Envíos sin cargo en La Plata
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
          Entrega en el día
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="w-4 h-4 text-gray-400" aria-hidden="true" />
          Coordinamos punto de entrega
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4",
        className
      )}
    >
      <Truck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-emerald-900">{MESSAGE}</p>
        <p className="text-xs text-emerald-700/80 mt-0.5">
          Para el resto del país despachamos por correo con seguimiento.
        </p>
      </div>
    </div>
  );
}
