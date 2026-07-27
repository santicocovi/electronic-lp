import Link from "next/link";
import type { Metadata } from "next";
import { SearchX, Home, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: false },
};

/** Pantalla 404 de la tienda. Antes se mostraba la genérica de Next. */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-24">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
          <SearchX className="h-6 w-6 text-gray-400" aria-hidden="true" />
        </span>

        <p className="text-sm font-medium tracking-widest text-gray-300">404</p>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
          No encontramos esta página
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
          Puede que el enlace esté desactualizado o que el producto ya no esté disponible.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/products">
            <Button className="w-full gap-2 rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover sm:w-auto">
              <Package className="h-4 w-4" aria-hidden="true" />
              Ver el catálogo
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full gap-2 rounded-xl sm:w-auto">
              <Home className="h-4 w-4" aria-hidden="true" />
              Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
