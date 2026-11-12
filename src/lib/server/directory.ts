import "server-only";
import { and, asc, avg, count, desc, eq, gte, ilike, inArray, lte, min, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  credentials,
  profileViews,
  psychologistProfiles,
  psychologistSpecializations,
  reviews,
  services,
  specializations,
  users,
} from "@/db/schema";
import { nextAvailableSlot } from "./booking";

export type DirectoryFilters = {
  q?: string;
  spec?: string; // specialization slug
  lang?: string;
  mode?: "online" | "in_person";
  maxPrice?: number; // GHS
  minExp?: number;
  available?: "week" | "any";
  sort?: "soonest" | "rating" | "price" | "experience";
};

/** Public listing condition: verified, active account, accepting clients, at least one active service. */
const listable = () =>
  and(
    eq(users.status, "active"),
    eq(psychologistProfiles.verificationStatus, "approved"),
    eq(psychologistProfiles.acceptingClients, true),
    sql`EXISTS (SELECT 1 FROM ${services} s WHERE s.psychologist_id = ${psychologistProfiles.userId} AND s.active)`,
  );

export async function searchPsychologists(f: DirectoryFilters) {
  const db = await getDb();
  const conds = [listable()];
  if (f.q?.trim()) {
    const q = `%${f.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(users.name, q), ilike(psychologistProfiles.title, q), ilike(psychologistProfiles.bio, q))!);
  }
  if (f.spec) {
    conds.push(sql`EXISTS (SELECT 1 FROM ${psychologistSpecializations} ps JOIN ${specializations} sp ON sp.id = ps.specialization_id
      WHERE ps.psychologist_id = ${psychologistProfiles.userId} AND sp.slug = ${f.spec})`);
  }
  if (f.lang) conds.push(sql`${f.lang} = ANY(${psychologistProfiles.languages})`);
  if (f.mode) conds.push(sql`EXISTS (SELECT 1 FROM ${services} s WHERE s.psychologist_id = ${psychologistProfiles.userId} AND s.active AND ${f.mode}::consultation_mode = ANY(s.modes))`);
  if (f.maxPrice != null) conds.push(sql`EXISTS (SELECT 1 FROM ${services} s WHERE s.psychologist_id = ${psychologistProfiles.userId} AND s.active AND s.price_minor <= ${Math.round(f.maxPrice * 100)})`);
  if (f.minExp != null) conds.push(gte(psychologistProfiles.yearsExperience, f.minExp));

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarFileId: users.avatarFileId,
      title: psychologistProfiles.title,
      bio: psychologistProfiles.bio,
      yearsExperience: psychologistProfiles.yearsExperience,
      languages: psychologistProfiles.languages,
      location: psychologistProfiles.location,
      licenseCategory: psychologistProfiles.licenseCategory,
    })
    .from(psychologistProfiles)
    .innerJoin(users, eq(users.id, psychologistProfiles.userId))
    .where(and(...conds))
    .limit(200);
  return enrich(rows, f);
}

async function enrich<T extends { id: string }>(rows: T[], f: DirectoryFilters = {}) {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const [specRows, priceRows, ratingRows] = await Promise.all([
    db
      .select({ psychologistId: psychologistSpecializations.psychologistId, name: specializations.name, slug: specializations.slug })
      .from(psychologistSpecializations)
      .innerJoin(specializations, eq(specializations.id, psychologistSpecializations.specializationId))
      .where(and(inArray(psychologistSpecializations.psychologistId, ids), eq(specializations.active, true))),
    db
      .select({
        psychologistId: services.psychologistId,
        minPrice: min(services.priceMinor),
        minDuration: min(services.durationMinutes),
        modes: sql<string[]>`array_agg(DISTINCT m)`,
      })
      .from(services)
      .crossJoin(sql`unnest(${services.modes}) AS m`)
      .where(and(inArray(services.psychologistId, ids), eq(services.active, true)))
      .groupBy(services.psychologistId),
    db
      .select({ psychologistId: reviews.psychologistId, avg: avg(reviews.rating), n: count() })
      .from(reviews)
      .where(and(inArray(reviews.psychologistId, ids), eq(reviews.hidden, false)))
      .groupBy(reviews.psychologistId),
  ]);

  const out = await Promise.all(
    rows.map(async (r) => {
      const price = priceRows.find((p) => p.psychologistId === r.id);
      const rating = ratingRows.find((x) => x.psychologistId === r.id);
      const next = price?.minDuration ? await nextAvailableSlot(r.id, price.minDuration) : null;
      return {
        ...r,
        specializations: specRows.filter((s) => s.psychologistId === r.id).map(({ name, slug }) => ({ name, slug })),
        minPriceMinor: price?.minPrice ?? null,
        modes: (price?.modes ?? []) as ("online" | "in_person")[],
        rating: rating ? Number(rating.avg) : null,
        reviewCount: rating?.n ?? 0,
        nextAvailable: next,
      };
    }),
  );

  const filtered = f.available === "week" ? out.filter((p) => p.nextAvailable && p.nextAvailable.getTime() - Date.now() < 7 * 86400_000) : out;
  const sorters: Record<string, (a: (typeof out)[number], b: (typeof out)[number]) => number> = {
    soonest: (a, b) => (a.nextAvailable?.getTime() ?? Infinity) - (b.nextAvailable?.getTime() ?? Infinity),
    rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount,
    price: (a, b) => (a.minPriceMinor ?? Infinity) - (b.minPriceMinor ?? Infinity),
    experience: (a, b) => (b as unknown as { yearsExperience: number }).yearsExperience - (a as unknown as { yearsExperience: number }).yearsExperience,
  };
  return filtered.sort(sorters[f.sort ?? "soonest"] ?? sorters.soonest);
}

export type DirectoryCard = Awaited<ReturnType<typeof searchPsychologists>>[number];

/** Public profile. Returns null unless listable, except for the owner/admin preview (`allowUnlisted`). */
export async function getPsychologistProfile(id: string, opts: { allowUnlisted?: boolean } = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarFileId: users.avatarFileId,
      status: users.status,
      title: psychologistProfiles.title,
      bio: psychologistProfiles.bio,
      yearsExperience: psychologistProfiles.yearsExperience,
      languages: psychologistProfiles.languages,
      location: psychologistProfiles.location,
      licenseCategory: psychologistProfiles.licenseCategory,
      licensingBody: psychologistProfiles.licensingBody,
      verificationStatus: psychologistProfiles.verificationStatus,
      acceptingClients: psychologistProfiles.acceptingClients,
      timezone: psychologistProfiles.timezone,
      minNoticeHours: psychologistProfiles.minNoticeHours,
      autoConfirm: psychologistProfiles.autoConfirm,
    })
    .from(psychologistProfiles)
    .innerJoin(users, eq(users.id, psychologistProfiles.userId))
    .where(opts.allowUnlisted ? eq(users.id, id) : and(eq(users.id, id), listable()))
    .limit(1);
  if (!row) return null;

  const [creds, specs, svc, revs, agg] = await Promise.all([
    db
      .select({ kind: credentials.kind, title: credentials.title, institution: credentials.institution, year: credentials.year })
      .from(credentials)
      .where(eq(credentials.psychologistId, id))
      .orderBy(desc(credentials.year)),
    db
      .select({ name: specializations.name, slug: specializations.slug })
      .from(psychologistSpecializations)
      .innerJoin(specializations, eq(specializations.id, psychologistSpecializations.specializationId))
      .where(and(eq(psychologistSpecializations.psychologistId, id), eq(specializations.active, true))),
    db
      .select()
      .from(services)
      .where(and(eq(services.psychologistId, id), eq(services.active, true)))
      .orderBy(asc(services.priceMinor)),
    db
      .select({ rating: reviews.rating, comment: reviews.comment, createdAt: reviews.createdAt, clientName: users.name })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.clientId))
      .where(and(eq(reviews.psychologistId, id), eq(reviews.hidden, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(20),
    db.select({ avg: avg(reviews.rating), n: count() }).from(reviews).where(and(eq(reviews.psychologistId, id), eq(reviews.hidden, false))),
  ]);
  return {
    ...row,
    credentials: creds,
    specializations: specs,
    services: svc,
    // Reviews show first name + initial only
    reviews: revs.map((r) => ({ ...r, clientName: `${r.clientName.split(" ")[0]} ${r.clientName.split(" ")[1]?.[0] ?? ""}`.trim() })),
    rating: agg[0]?.n ? Number(agg[0].avg) : null,
    reviewCount: agg[0]?.n ?? 0,
  };
}

export async function recordProfileView(userId: string, psychologistId: string) {
  const db = await getDb();
  await db
    .insert(profileViews)
    .values({ userId, psychologistId })
    .onConflictDoUpdate({ target: [profileViews.userId, profileViews.psychologistId], set: { viewedAt: new Date() } });
}

export async function recentlyViewed(userId: string, limit = 4) {
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarFileId: users.avatarFileId,
      title: psychologistProfiles.title,
      yearsExperience: psychologistProfiles.yearsExperience,
      languages: psychologistProfiles.languages,
      location: psychologistProfiles.location,
      licenseCategory: psychologistProfiles.licenseCategory,
      bio: psychologistProfiles.bio,
    })
    .from(profileViews)
    .innerJoin(psychologistProfiles, eq(psychologistProfiles.userId, profileViews.psychologistId))
    .innerJoin(users, eq(users.id, profileViews.psychologistId))
    .where(and(eq(profileViews.userId, userId), listable()))
    .orderBy(desc(profileViews.viewedAt))
    .limit(limit);
  return enrich(rows);
}

/** Recommendations: psychologists matching the client's preferred language and past specialisations, soonest first. */
export async function recommendedFor(userId: string, limit = 3) {
  const db = await getDb();
  const [u] = await db.select({ lang: users.preferredLanguage }).from(users).where(eq(users.id, userId));
  const all = await searchPsychologists({ lang: u?.lang ?? undefined, sort: "soonest" });
  const list = all.length >= limit ? all : await searchPsychologists({ sort: "rating" });
  return list.slice(0, limit);
}

export { lte };
