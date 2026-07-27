import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.emailVerified = Boolean((user as { emailVerified?: Date | null }).emailVerified);
      }

      // Permite refrescar el flag sin re-loguear, tras verificar el email:
      // basta con llamar a useSession().update() desde el cliente.
      if (trigger === "update" && (session as { isEmailVerified?: boolean })?.isEmailVerified) {
        token.emailVerified = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        // `emailVerified` ya existe en el tipo de NextAuth como Date|null, así que
        // el flag booleano se expone con otro nombre para no pisarlo.
        const u = session.user as unknown as { role?: string; isEmailVerified?: boolean };
        u.role = token.role as string;
        // Pista para la UI. Las restricciones reales se validan contra la base
        // de datos en el servidor, porque el JWT puede estar desactualizado.
        u.isEmailVerified = Boolean(token.emailVerified);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
