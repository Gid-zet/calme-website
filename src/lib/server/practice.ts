import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  availabilityOverrides,
  availabilityRules,
  credentials,
  files,
  psychologistProfiles,
  psychologistSpecializations,
  reviews,
  services,
  users,
  verificationRequests,
} from "@/db/schema";

/** Everything about the signed-in psychologist's own practice. Always scoped to their id. */
export async function getPractice(psychologistId: string) {
  const db = await getDb();
  const [profile] = await db
    .select({ p: psychologistProfiles, avatarFileId: users.avatarFileId, name: users.name, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
    .from(psychologistProfiles)
    .innerJoin(users, eq(users.id, psychologistProfiles.userId))
    .where(eq(psychologistProfiles.userId, psychologistId));
  const [svc, rules, specs, creds] = await Promise.all([
    db.select().from(services).where(eq(services.psychologistId, psychologistId)).orderBy(asc(services.createdAt)),
    db.select().from(availabilityRules).where(eq(availabilityRules.psychologistId, psychologistId)),
    db.select({ id: psychologistSpecializations.specializationId }).from(psychologistSpecializations).where(eq(psychologistSpecializations.psychologistId, psychologistId)),
    db
      .select({ c: credentials, docName: files.originalName })
      .from(credentials)
      .leftJoin(files, eq(files.id, credentials.documentFileId))
      .where(eq(credentials.psychologistId, psychologistId))
      .orderBy(desc(credentials.year)),
  ]);
  const checklist = [
    { key: "email", label: "Confirm your email", done: Boolean(profile.emailVerifiedAt), href: "/practice/account" },
    { key: "photo", label: "Add a profile photo", done: Boolean(profile.avatarFileId), href: "/practice/profile" },
    { key: "services", label: "Publish at least one service", done: svc.some((s) => s.active), href: "/practice/services" },
    { key: "hours", label: "Set your weekly hours", done: rules.length > 0, href: "/practice/availability" },
    { key: "verified", label: "Get verified by CalMe", done: profile.p.verificationStatus === "approved", href: "/practice/verification" },
  ];
  return {
    ...profile.p,
    name: profile.name,
    email: profile.email,
    avatarFileId: profile.avatarFileId,
    services: svc,
    rules,
    specializationIds: specs.map((s) => s.id),
    credentials: creds.map((r) => ({ ...r.c, docName: r.docName })),
    checklist,
    listed: profile.p.verificationStatus === "approved" && profile.p.acceptingClients && svc.some((s) => s.active),
  };
}

export async function practiceStats(psychologistId: string) {
  const db = await getDb();
  const now = new Date();
  const mine = eq(appointments.psychologistId, psychologistId);
  const [byStatus, upcoming, clients, fees, rating, pending] = await Promise.all([
    db.select({ status: appointments.status, n: count() }).from(appointments).where(mine).groupBy(appointments.status),
    db.select({ n: count() }).from(appointments).where(and(mine, eq(appointments.status, "confirmed"), gte(appointments.startsAt, now))),
    db.select({ n: countDistinct(appointments.clientId) }).from(appointments).where(and(mine, inArray(appointments.status, ["confirmed", "completed", "no_show"]))),
    db
      .select({ total: sum(appointments.priceMinor), month: sql<string>`COALESCE(SUM(${appointments.priceMinor}) FILTER (WHERE ${appointments.startsAt} >= date_trunc('month', now())), 0)` })
      .from(appointments)
      .where(and(mine, eq(appointments.status, "completed"))),
    db.select({ avg: sql<string | null>`AVG(${reviews.rating})`, n: count() }).from(reviews).where(and(eq(reviews.psychologistId, psychologistId), eq(reviews.hidden, false))),
    db.select({ n: count() }).from(appointments).where(and(mine, eq(appointments.status, "pending"))),
  ]);
  const s = Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>;
  return {
    total: byStatus.reduce((a, r) => a + r.n, 0),
    upcoming: upcoming[0].n,
    pending: pending[0].n,
    completed: s.completed ?? 0,
    noShow: s.no_show ?? 0,
    cancelled: (s.cancelled ?? 0) + (s.declined ?? 0),
    clients: clients[0].n,
    feesTotalMinor: Number(fees[0].total ?? 0),
    feesMonthMinor: Number(fees[0].month ?? 0),
    rating: rating[0].n ? Number(rating[0].avg) : null,
    reviewCount: rating[0].n,
  };
}

export async function pendingCount(psychologistId: string) {
  const db = await getDb();
  const [r] = await db.select({ n: count() }).from(appointments).where(and(eq(appointments.psychologistId, psychologistId), eq(appointments.status, "pending")));
  return r.n;
}

export async function overridesFor(psychologistId: string, fromDate: string) {
  const db = await getDb();
  return db
    .select()
    .from(availabilityOverrides)
    .where(and(eq(availabilityOverrides.psychologistId, psychologistId), gte(availabilityOverrides.endDate, fromDate)))
    .orderBy(asc(availabilityOverrides.startDate));
}

export async function verificationHistory(psychologistId: string) {
  const db = await getDb();
  return db.select().from(verificationRequests).where(eq(verificationRequests.psychologistId, psychologistId)).orderBy(desc(verificationRequests.createdAt));
}

/** Active bookings that fall on dates the psychologist has since blocked: they need attention. */
export async function bookingsOnBlockedDays(psychologistId: string, tz: string) {
  const db = await getDb();
  return db
    .select({ id: appointments.id, startsAt: appointments.startsAt })
    .from(appointments)
    .innerJoin(
      availabilityOverrides,
      and(
        eq(availabilityOverrides.psychologistId, appointments.psychologistId),
        eq(availabilityOverrides.kind, "blocked"),
        sql`(${appointments.startsAt} AT TIME ZONE ${tz})::date BETWEEN ${availabilityOverrides.startDate} AND ${availabilityOverrides.endDate}`,
      ),
    )
    .where(and(eq(appointments.psychologistId, psychologistId), inArray(appointments.status, ["pending", "confirmed"]), gte(appointments.startsAt, new Date())));
}

export { lt };
