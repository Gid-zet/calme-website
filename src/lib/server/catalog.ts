import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { specializations } from "@/db/schema";

/** Public, rarely-changing lists. Cached on the server and refreshed with updateTag("specializations"). */
export async function getActiveSpecializations() {
  "use cache";
  cacheTag("specializations");
  cacheLife("hours");
  const db = await getDb();
  return db
    .select({ id: specializations.id, name: specializations.name, slug: specializations.slug })
    .from(specializations)
    .where(eq(specializations.active, true))
    .orderBy(asc(specializations.name));
}

export const LANGUAGES = ["English", "Twi", "Ga", "Ewe", "Fante", "Dagbani", "Hausa", "Nzema", "French"];
