import { randomBytes } from "crypto";
import { db } from "@/lib/db";

/** Tokens de un solo uso para verificación de email y reseteo de contraseña. */

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/** 256 bits de entropía en hex: no adivinable por fuerza bruta. */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Genera un token de verificación para `email`, invalidando los anteriores
 * para que solo el último link enviado siga siendo válido.
 */
export async function createVerificationToken(email: string) {
  const token = generateToken();
  const expires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({ data: { identifier: email, token, expires } });

  return { token, expires };
}

/**
 * Consume un token de verificación. Devuelve el email asociado si es válido.
 * El token se borra siempre que se encuentre (válido o expirado) para que no
 * quede basura ni sea reutilizable.
 */
export async function consumeVerificationToken(
  token: string
): Promise<{ ok: true; email: string } | { ok: false; reason: "invalid" | "expired" }> {
  const record = await db.verificationToken.findUnique({ where: { token } });
  if (!record) return { ok: false, reason: "invalid" };

  await db.verificationToken.delete({ where: { token } }).catch(() => {});

  if (record.expires < new Date()) return { ok: false, reason: "expired" };
  return { ok: true, email: record.identifier };
}

export async function createPasswordResetToken(email: string) {
  const token = generateToken();
  const expires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await db.passwordResetToken.deleteMany({ where: { email } });
  await db.passwordResetToken.create({ data: { email, token, expires } });

  return { token, expires };
}
