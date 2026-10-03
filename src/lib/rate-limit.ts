import { db } from "./db";

/**
 * Fixed-window rate limiter backed by Postgres.
 *
 * It used to be an in-memory Map, which on Vercel meant every serverless
 * instance kept its own count and forgot it on a cold start — a flood spread
 * across instances was barely slowed. The count now lives in one table that
 * every instance shares, updated in a single atomic upsert.
 *
 * Fails open: if the database hiccups, a customer's message or enquiry still
 * goes through rather than being refused by the thing meant to protect it.
 */
export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const [row] = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimitHit" ("key", "count", "resetAt")
      VALUES (${key}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitHit"."resetAt" < NOW() THEN 1
                       ELSE "RateLimitHit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitHit"."resetAt" < NOW() THEN EXCLUDED."resetAt"
                         ELSE "RateLimitHit"."resetAt" END
      RETURNING "count", "resetAt"`;

    // Expired rows are dead weight; sweep them now and then rather than on
    // every request.
    if (Math.random() < 0.01) {
      void db.$executeRaw`DELETE FROM "RateLimitHit" WHERE "resetAt" < NOW()`.catch(() => {});
    }

    if (row.count > limit) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
      };
    }
    return { ok: true, retryAfter: 0 };
  } catch (e) {
    console.error("rate limiter unavailable, allowing request", e);
    return { ok: true, retryAfter: 0 };
  }
}

/**
 * Reads a bucket without adding to it — for the login form, which only counts
 * failed attempts, so it must know whether it is already locked before trying.
 */
export async function rateLimitStatus(
  key: string,
  { limit }: { limit: number },
): Promise<{ ok: boolean; retryAfter: number }> {
  try {
    const row = await db.rateLimitHit.findUnique({ where: { key } });
    if (!row || row.resetAt.getTime() < Date.now() || row.count < limit) {
      return { ok: true, retryAfter: 0 };
    }
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
    };
  } catch {
    return { ok: true, retryAfter: 0 };
  }
}

/**
 * On Vercel, x-forwarded-for is overwritten by the platform with the real
 * client address, so the first entry can be trusted there. Behind a proxy you
 * run yourself, make sure it replaces (not appends to) this header.
 */
export function clientKey(headers: Headers, scope: string): string {
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  return `${scope}:${ip}`;
}
