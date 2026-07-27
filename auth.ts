import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { loginSchema } from "@/validations";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Búsqueda case-insensitive: las cuentas viejas pueden tener mayúsculas.
        const user = await db.user.findFirst({
          where: { email: { equals: parsed.data.email.trim(), mode: "insensitive" } },
        });

        // Cuenta creada solo con Google (sin contraseña local).
        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(parsed.data.password, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  events: {
    /**
     * Google ya validó la dirección, así que la cuenta queda verificada al
     * vincularse. Evita pedirle al usuario que confirme un email que el
     * proveedor de identidad ya confirmó.
     */
    async linkAccount({ user }) {
      if (user.id) {
        await db.user
          .update({ where: { id: user.id }, data: { emailVerified: new Date() } })
          .catch(() => {});
      }
    },
  },
});
