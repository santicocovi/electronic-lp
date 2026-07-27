/**
 * Rate limiter en memoria (ventana fija) para endpoints públicos: registro,
 * reenvío de verificación, reseteo de contraseña, contacto y newsletter.
 *
 * NOTA: es por proceso. Alcanza para un único servidor (el caso actual). Si en
 * algún momento se escala a varias instancias o a serverless con muchos lambdas,
 * hay que reemplazar el Map por Redis/Upstash — la firma de `rateLimit` no cambia.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Limpieza periódica para que el Map no crezca sin límite.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key      Identificador del cliente (ip + acción, o email + acción).
 * @param limit    Cantidad de intentos permitidos por ventana.
 * @param windowMs Duración de la ventana en milisegundos.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Extrae la IP del cliente respetando los headers de proxy habituales. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
