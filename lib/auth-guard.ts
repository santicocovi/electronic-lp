import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Guardas de autenticación/autorización para Server Actions y Route Handlers.
 *
 * Regla: nunca confiar en datos que manda el cliente para decidir identidad ni
 * permisos. El `userId` sale siempre de la sesión, y el rol se relee de la base
 * en las operaciones sensibles porque el JWT puede haber sido emitido antes de
 * que a ese usuario se le quitara el rol de administrador.
 */

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "EMAIL_UNVERIFIED"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: Date | null;
}

/** Devuelve el usuario logueado leído de la base, o null si no hay sesión válida. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, emailVerified: true },
  });

  return user ?? null;
}

/** Exige sesión iniciada. Lanza AuthError si no la hay. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Necesitás iniciar sesión", "UNAUTHENTICATED");
  return user;
}

/**
 * Exige sesión iniciada y email confirmado. Se usa para comprar: evita pedidos
 * con direcciones de correo inexistentes o de terceros.
 */
export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerified) {
    throw new AuthError(
      "Necesitás confirmar tu email antes de completar la compra",
      "EMAIL_UNVERIFIED"
    );
  }
  return user;
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPERADMIN";
}

/** Exige rol de administrador, releído de la base de datos. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdminRole(user.role)) throw new AuthError("No autorizado", "FORBIDDEN");
  return user;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "SUPERADMIN") throw new AuthError("No autorizado", "FORBIDDEN");
  return user;
}

/**
 * Traduce cualquier error de una action a un mensaje seguro para el usuario.
 * Los errores inesperados se loguean completos pero se devuelven genéricos,
 * para no filtrar detalles internos (nombres de tablas, stack traces).
 */
export function toActionError(error: unknown, fallback: string): { success: false; error: string } {
  if (error instanceof AuthError) return { success: false, error: error.message };
  console.error(`[action] ${fallback}:`, error);
  return { success: false, error: fallback };
}
