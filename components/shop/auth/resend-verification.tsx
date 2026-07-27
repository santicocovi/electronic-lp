"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationEmail } from "@/actions/auth";

interface ResendVerificationProps {
  /** Si se conoce el email (ej: usuario logueado), se oculta el campo. */
  defaultEmail?: string;
  hideInput?: boolean;
}

export function ResendVerification({ defaultEmail = "", hideInput = false }: ResendVerificationProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "error" } | null>(null);

  async function handleResend() {
    if (!email.trim()) {
      setMessage({ text: "Ingresá tu email", type: "error" });
      return;
    }

    setPending(true);
    setMessage(null);

    const result = await resendVerificationEmail(email);

    setMessage(
      result.success
        ? { text: "Si el email está registrado y sin verificar, te enviamos un nuevo link.", type: "ok" }
        : { text: result.error ?? "No pudimos reenviar el email", type: "error" }
    );
    setPending(false);
  }

  return (
    <div className="text-left">
      {!hideInput && (
        <div className="mb-3">
          <Label htmlFor="resend-email">Tu email</Label>
          <Input
            id="resend-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 rounded-xl h-11"
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>
      )}

      <Button
        type="button"
        onClick={handleResend}
        disabled={pending}
        variant="outline"
        className="w-full rounded-xl h-11 gap-2"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="w-4 h-4" aria-hidden="true" />
        )}
        Reenviar link de verificación
      </Button>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm text-center ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
