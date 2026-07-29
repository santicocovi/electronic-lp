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
    /**
     * AVIF primero y WebP de respaldo. A la calidad que ahora declara cada
     * `<Image>` (ver lib/media.ts), AVIF conserva los degradados sin bandas y
     * aun así pesa menos que el JPEG original.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * Anchos que puede generar el optimizador. Se agrega 1536 —que no está en
     * el conjunto por defecto— porque es justo el ancho que pide la galería de
     * producto en una pantalla de 15" con densidad 2x: sin ese escalón el
     * navegador tenía que elegir entre 1200 (y estirar, perdiendo nitidez) o
     * 1920 (y descargar de más).
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1536, 1920, 2048, 3840],
    /** Tamaños para miniaturas y avatares. */
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    /**
     * Cachea la imagen ya optimizada 30 días. Reprocesar cuesta tiempo y, en
     * Vercel, transformaciones facturables; el archivo de origen no cambia
     * nunca porque Cloudinary le da una URL distinta a cada subida.
     */
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
