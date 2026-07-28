import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, XCircle, MailWarning } from "lucide-react";
import { verifyEmail } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth-guard";
import { ResendVerification } from "@/components/shop/auth/resend-verification";

export const metadata: Metadata = {
  title: "Verificar email",
  robots: { index: false, follow: false },
};

// El token es de un solo uso: la página nunca debe servirse cacheada.
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Sin token: se muestra el formulario de reenvío en lugar de un error.
  if (!token) {
    // Si el visitante ya inició sesión se conoce su dirección: se prellena y se
    // oculta el campo, así no tiene que volver a escribirla.
    const user = await getCurrentUser();

    // Cuenta ya confirmada: no tiene sentido dejarlo en esta pantalla.
    if (user?.emailVerified) redirect("/profile");

    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <MailWarning className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificá tu email</h1>
        <p className="text-gray-500 text-sm mb-6">
          {user
            ? <>Te enviamos un link de confirmación a <strong className="text-gray-900">{user.email}</strong>. Revisá tu bandeja de entrada y la carpeta de spam.</>
            : "Te enviamos un link de confirmación. Revisá tu bandeja de entrada y la carpeta de spam."}
        </p>
        <ResendVerification defaultEmail={user?.email ?? ""} hideInput={Boolean(user)} />
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-brand-blue-mid font-medium hover:underline"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  const result = await verifyEmail(token);

  if (result.success) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verificado</h1>
        <p className="text-gray-500 text-sm mb-8">
          Tu cuenta quedó confirmada. Ya podés iniciar sesión y comprar con normalidad.
        </p>
        <Link
          href="/login?verified=1"
          className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-brand-blue-mid text-white font-medium hover:bg-brand-blue-hover transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
      <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">No pudimos verificar tu email</h1>
      <p className="text-gray-500 text-sm mb-6">{result.error}</p>
      <ResendVerification />
      <Link
        href="/login"
        className="mt-6 inline-block text-sm text-brand-blue-mid font-medium hover:underline"
      >
        Volver a iniciar sesión
      </Link>
    </div>
  );
}
