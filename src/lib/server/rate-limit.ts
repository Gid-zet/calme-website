import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window rate limiter stored in Postgres, so it holds across serverless instances.
 * Returns ok=false once `limit` hits are recorded inside `windowSeconds`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const db = await getDb();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  // Raw SQL fragments bypass Drizzle's column mapping, and postgres.js can't serialise a JS Date there,
  // so pass ISO strings with an explicit cast.
  const nowParam = sql`${now.toISOString()}::timestamptz`;
  const resetParam = sql`${resetAt.toISOString()}::timestamptz`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.resetAt} <= ${nowParam} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= ${nowParam} THEN ${resetParam} ELSE ${rateLimits.resetAt} END`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });
  return { ok: row.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)) };
}

export async function clearRateLimit(key: string) {
  const db = await getDb();
  await db.delete(rateLimits).where(sql`${rateLimits.key} = ${key}`);
}
