import type { NextConfig } from "next";

/**
 * Orígenes autorizados para Server Actions.
 *
 * Estaba fijo en "localhost:3000", lo que en producción hace que Next rechace
 * todas las Server Actions por origen inválido. Ahora se deriva del dominio
 * configurado y se mantiene localhost para desarrollo.
 */
function serverActionOrigins(): string[] {
  const origins = new Set<string>(["localhost:3000", "127.0.0.1:3000"]);

  for (const raw of [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL]) {
    if (!raw) continue;
    try {
      // Se acepta con o sin protocolo.
      const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
      origins.add(url.host);
    } catch {
      // Valor mal formado: se ignora en lugar de romper el build.
    }
  }

  return [...origins];
}

/**
 * Cabeceras de seguridad.
 *
 * No se define Content-Security-Policy acá a propósito: la app usa estilos
 * inline de Tailwind y scripts inline de Next, así que una CSP mal calibrada
 * rompería el sitio en silencio. Queda anotado como paso manual pendiente.
 */
const securityHeaders = [
  // Evita que el navegador adivine el tipo de contenido (defensa ante XSS por upload).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // El sitio no debe poder embeberse en un iframe ajeno (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // No filtrar la URL completa hacia sitios externos.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Se deshabilitan APIs del navegador que la tienda no usa.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Fuerza HTTPS durante un año una vez que el dominio esté con certificado.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Oculta la versión de Next en las respuestas.
  poweredByHeader: false,
  experimental: {
    serverActions: { allowedOrigins: serverActionOrigins() },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
