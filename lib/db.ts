import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Cliente de Prisma con reintento ante arranque en frío.
 *
 * La base es Neon (Postgres serverless): se suspende sola tras un rato sin
 * tráfico y la primera consulta que llega mientras despierta falla con P1001
 * ("Can't reach database server"). Sin reintento, esa única consulta hace que la
 * portada devuelva un 500 al primer visitante después de un período de calma.
 *
 * El reintento solo cubre errores de conexión (P1001/P1002/P1017). Los errores
 * de consulta se propagan tal cual, para no esconder bugs reales.
 */

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1017"]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 350;

function isConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }
  // Los errores de inicialización también aparecen al despertar la instancia.
  return error instanceof Prisma.PrismaClientInitializationError;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return client.$extends({
    query: {
      async $allOperations({ args, query, model, operation }) {
        let lastError: unknown;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isConnectionError(error) || attempt === MAX_RETRIES) throw error;

            // Retroceso exponencial: 350ms, 700ms, 1400ms.
            const delay = BASE_DELAY_MS * 2 ** attempt;
            console.warn(
              `[db] ${model ?? "raw"}.${operation}: la base no responde ` +
                `(intento ${attempt + 1}/${MAX_RETRIES}). Reintento en ${delay}ms.`
            );
            await sleep(delay);
          }
        }

        throw lastError;
      },
    },
  }) as unknown as PrismaClient;
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
