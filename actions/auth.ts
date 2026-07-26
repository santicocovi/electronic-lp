"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mail";
import type { ActionResult } from "@/types";
import type { RegisterInput } from "@/validations";

export async function registerUser(data: RegisterInput): Promise<ActionResult> {
  try {
    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists) return { success: false, error: "Ya existe una cuenta con ese email" };

    const hashedPassword = await bcrypt.hash(data.password, 12);
    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Error al crear la cuenta" };
  }
}

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  try {
    const user = await db.user.findUnique({ where: { email } });
    // Always return success to avoid user enumeration
    if (!user) return { success: true };

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await db.passwordResetToken.upsert({
      where: { email },
      create: { email, token, expires },
      update: { token, expires },
    }).catch(async () => {
      // If unique constraint fails, create new
      await db.passwordResetToken.create({ data: { email, token, expires } });
    });

    await sendPasswordResetEmail(email, token);
    return { success: true };
  } catch {
    return { success: false, error: "Error al enviar el email" };
  }
}

export async function resetPassword(token: string, password: string): Promise<ActionResult> {
  try {
    const record = await db.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.expires < new Date()) {
      return { success: false, error: "Token inválido o expirado" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { email: record.email },
      data: { password: hashedPassword },
    });
    await db.passwordResetToken.delete({ where: { token } });
    return { success: true };
  } catch {
    return { success: false, error: "Error al restablecer la contraseña" };
  }
}
