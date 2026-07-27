"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Límite de error de la aplicación.
 *
 * Sin este archivo, cualquier excepción no atrapada en un Server Component
 * (por ejemplo, una consulta que falla porque la base serverless está
 * despertando) mostraba la pantalla de error cruda de Next. Acá se muestra algo
 * presentable, con la opción de reintentar sin recargar toda la página.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda registrado para poder diagnosticarlo desde los logs del servidor.
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-24">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <AlertTriangle className="h-6 w-6 text-amber-600" aria-hidden="true" />
        </span>

        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Algo no salió como esperábamos
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-gray-500">
          Hubo un problema al cargar esta sección. Suele ser momentáneo: probá de nuevo en unos
          segundos.
        </p>

        {/* El digest permite correlacionar con los logs del servidor sin exponer el stack. */}
        {error.digest && (
          <p className="mt-4 font-mono text-xs text-gray-300">Referencia: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2 rounded-xl bg-brand-blue-mid hover:bg-brand-blue-hover">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>

          <Link href="/">
            <Button variant="outline" className="w-full gap-2 rounded-xl sm:w-auto">
              <Home className="h-4 w-4" aria-hidden="true" />
              Ir al inicio
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          Si el problema sigue, escribinos por{" "}
          <a
            href="https://wa.me/5492214358517"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue-mid hover:underline"
          >
            WhatsApp
          </a>
          .
        </p>
      </div>
    </div>
  );
}
