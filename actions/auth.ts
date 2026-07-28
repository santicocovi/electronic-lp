"use server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetEmail, sendVerificationEmail, isMailConfigured } from "@/lib/mail";
import {
  createPasswordResetToken,
  createVerificationToken,
  consumeVerificationToken,
} from "@/lib/tokens";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from "@/validations";
import type { ActionResult } from "@/types";
import type { RegisterInput } from "@/validations";

/** Normaliza el email para evitar cuentas duplicadas por diferencias de mayúsculas. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function clientKey(action: string): Promise<string> {
  const ip = getClientIp(await headers());
  return `${action}:${ip}`;
}

export async function registerUser(
  data: RegisterInput
): Promise<ActionResult<{ emailSent: boolean }>> {
  try {
    // Revalidación en el servidor: el esquema del cliente puede saltearse.
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const limit = rateLimit(await clientKey("register"), 5, 60 * 60 * 1000);
    if (!limit.success) {
      return { success: false, error: "Demasiados intentos. Probá de nuevo en un rato." };
    }

    const email = normalizeEmail(parsed.data.email);

    const exists = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (exists) return { success: false, error: "Ya existe una cuenta con ese email" };

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await db.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        password: hashedPassword,
      },
    });

    // El token se crea siempre; el envío puede fallar y se reintenta con "reenviar".
    const { token } = await createVerificationToken(email);

    let emailSent = false;
    try {
      await sendVerificationEmail(email, token);
      emailSent = true;
    } catch (error) {
      console.error("[register] No se pudo enviar el email de verificación:", error);
    }

    return { success: true, data: { emailSent } };
  } catch (error) {
    // Colisión con el índice único: dos registros simultáneos con el mismo email.
    if ((error as { code?: string })?.code === "P2002") {
      return { success: false, error: "Ya existe una cuenta con ese email" };
    }
    console.error("[register] error:", error);
    return { success: false, error: "Error al crear la cuenta" };
  }
}

/** Confirma la dirección de email a partir del token del link enviado por correo. */
export async function verifyEmail(
  token: string
): Promise<ActionResult<{ email: string }>> {
  try {
    if (!token) return { success: false, error: "Falta el token de verificación" };

    const result = await consumeVerificationToken(token);

    if (!result.ok) {
      return {
        success: false,
        error:
          result.reason === "expired"
            ? "El link de verificación expiró. Pedí uno nuevo."
            : "El link de verificación no es válido o ya fue usado.",
      };
    }

    const user = await db.user.findFirst({
      where: { email: { equals: result.email, mode: "insensitive" } },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) return { success: false, error: "No encontramos la cuenta asociada a este link." };

    // Idempotente: si ya estaba verificada, se informa como éxito.
    if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    return { success: true, data: { email: user.email } };
  } catch (error) {
    console.error("[verifyEmail] error:", error);
    return { success: false, error: "Error al verificar el email" };
  }
}

/**
 * Reenvía el link de verificación. Responde siempre igual para no revelar
 * qué emails están registrados.
 */
export async function resendVerificationEmail(rawEmail: string): Promise<ActionResult> {
  const genericSuccess: ActionResult = { success: true };

  try {
    const email = normalizeEmail(rawEmail);
    if (!email) return { success: false, error: "Ingresá tu email" };

    const limit = rateLimit(`resend-verify:${email}`, 3, 15 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        error: `Ya pediste varios reenvíos. Esperá ${Math.ceil(limit.retryAfterSeconds / 60)} minuto(s).`,
      };
    }

    if (!isMailConfigured()) {
      return { success: false, error: "El envío de emails no está configurado. Contactanos por WhatsApp." };
    }

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true, emailVerified: true },
    });

    if (!user || user.emailVerified) return genericSuccess;

    const { token } = await createVerificationToken(user.email);
    await sendVerificationEmail(user.email, token);

    return genericSuccess;
  } catch (error) {
    console.error("[resendVerificationEmail] error:", error);
    return { success: false, error: "Error al reenviar el email" };
  }
}

export async function requestPasswordReset(rawEmail: string): Promise<ActionResult> {
  // Respuesta uniforme: no se revela si el email existe.
  const genericSuccess: ActionResult = { success: true };

  try {
    const parsed = forgotPasswordSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Email inválido" };
    }

    const email = normalizeEmail(parsed.data.email);

    // Sin SMTP el mail nunca va a llegar: conviene decirlo en vez de mostrar un
    // "revisá tu casilla" que deja al usuario esperando indefinidamente.
    if (!isMailConfigured()) {
      return {
        success: false,
        error: "El envío de emails no está configurado. Escribinos por WhatsApp y te ayudamos.",
      };
    }

    const limit = rateLimit(`reset:${email}`, 3, 15 * 60 * 1000);
    if (!limit.success) {
      return {
        success: false,
        error: `Demasiadas solicitudes. Esperá ${Math.ceil(limit.retryAfterSeconds / 60)} minuto(s).`,
      };
    }

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true },
    });
    if (!user) return genericSuccess;

    const { token } = await createPasswordResetToken(user.email);
    await sendPasswordResetEmail(user.email, token);

    return genericSuccess;
  } catch (error) {
    console.error("[requestPasswordReset] error:", error);
    // Se informa el fallo real para que el usuario no espere un mail que no llega.
    return { success: false, error: "No pudimos enviar el email. Intentá más tarde." };
  }
}

/**
 * Estado de un token de recuperación, sin consumirlo.
 *
 * Permite que la pantalla de "nueva contraseña" avise que el link venció ANTES
 * de que el usuario escriba una contraseña dos veces y recién ahí se entere.
 * No revela a quién pertenece el token.
 */
export async function checkPasswordResetToken(
  token: string
): Promise<"valid" | "expired" | "invalid"> {
  try {
    if (!token) return "invalid";

    const record = await db.passwordResetToken.findUnique({
      where: { token },
      select: { expires: true },
    });

    if (!record) return "invalid";
    return record.expires < new Date() ? "expired" : "valid";
  } catch (error) {
    console.error("[checkPasswordResetToken] error:", error);
    return "invalid";
  }
}

export async function resetPassword(token: string, password: string): Promise<ActionResult> {
  try {
    // La política de contraseña se revalida en el servidor.
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword: password });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Contraseña inválida" };
    }

    const record = await db.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
      // Se limpia el token vencido si existía.
      if (record) await db.passwordResetToken.delete({ where: { token } }).catch(() => {});
      return { success: false, error: "Token inválido o expirado" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.$transaction([
      db.user.update({
        where: { email: record.email },
        // Quien controla la casilla puede resetear: eso ya prueba que el email es suyo.
        data: { password: hashedPassword, emailVerified: new Date() },
      }),
      db.passwordResetToken.delete({ where: { token } }),
      // Limpia las sesiones persistidas del adaptador. Con la estrategia JWT
      // actual no hay filas que borrar, así que un JWT ya emitido sigue siendo
      // válido hasta que expira; queda por si se migra a sesiones en base.
      db.session.deleteMany({ where: { user: { email: record.email } } }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("[resetPassword] error:", error);
    return { success: false, error: "Error al restablecer la contraseña" };
  }
}
