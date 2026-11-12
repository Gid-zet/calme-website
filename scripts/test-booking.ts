/**
 * Integration tests for the booking engine against a throwaway embedded Postgres.
 *
 *   npm run test:booking
 *
 * Covers: double booking (concurrent), bookings outside availability, buffers, blocked dates,
 * client self-overlap, role/verification guards, reschedule rules, time zones, and auto-release.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// By default the tests use a throwaway embedded database. Set TEST_DATABASE_URL to an EMPTY, disposable
// Postgres database to run the same tests through the production driver (postgres.js). Never point it at real data.
const DIR = path.join(process.cwd(), ".data", "test-booking");
const REAL = process.env.TEST_DATABASE_URL;
if (REAL) process.env.DATABASE_URL = REAL;
else {
  delete process.env.DATABASE_URL;
  fs.rmSync(DIR, { recursive: true, force: true });
  process.env.PGLITE_DIR = DIR;
}
process.env.APP_URL = "http://test.local";
process.env.RESEND_API_KEY = "";

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    console.error(`  ✘ ${name}\n`, e);
    process.exitCode = 1;
  }
}

async function main() {
  const { getDb } = await import("../src/db");
  const s = await import("../src/db/schema");
  const booking = await import("../src/lib/server/booking");
  const { eq } = await import("drizzle-orm");
  if (REAL) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate((await getDb()) as never, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  }
  const db = await getDb();
  console.log(`Database: ${REAL ? "PostgreSQL via postgres.js" : "embedded PGlite"}`);

  // Fixtures: one verified psychologist (Mon–Fri 09:00–12:00 Accra, 50 min + 10 min break), clients.
  const [psych] = await db.insert(s.users).values({ email: "p@t.test", name: "Psy Chologist", role: "psychologist", emailVerifiedAt: new Date() }).returning();
  await db.insert(s.psychologistProfiles).values({ userId: psych.id, licenseNumber: "T1", verificationStatus: "approved", minNoticeHours: 0, bufferMinutes: 10, autoConfirm: true });
  const [svc] = await db.insert(s.services).values({ psychologistId: psych.id, name: "Therapy", durationMinutes: 50, priceMinor: 30000, modes: ["online"] }).returning();
  await db.insert(s.availabilityRules).values([1, 2, 3, 4, 5].map((d) => ({ psychologistId: psych.id, weekday: d, startMinute: 540, endMinute: 720 })));
  const mk = async (email: string, verified = true, role: "client" | "psychologist" = "client") =>
    (await db.insert(s.users).values({ email, name: email.split("@")[0], role, emailVerifiedAt: verified ? new Date() : null }).returning())[0];
  const [a, b, c, unverified] = await Promise.all([mk("a@t.test"), mk("b@t.test"), mk("c@t.test"), mk("u@t.test", false)]);

  // Next Monday 09:00 UTC (= Accra) at least 2 days out
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2 + ((8 - ((d.getUTCDay() + 2) % 7)) % 7));
  d.setUTCHours(9, 0, 0, 0);
  const at = (h: number, m = 0, plusDays = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + plusDays, h, m));
  const book = (clientId: string, start: Date, tz = "Africa/Accra") => booking.createBooking({ clientId, serviceId: svc.id, startsAt: start, mode: "online", clientTimezone: tz });

  console.log("Booking engine");

  await test("offers slots from weekly hours with the break applied", async () => {
    const { slots } = await booking.getSlotsForService(svc.id, at(0), at(23, 59));
    assert.deepEqual(slots.map((x) => x.toISOString().slice(11, 16)), ["09:00", "10:00", "11:00"]);
  });

  await test("two simultaneous bookings for the same slot: exactly one succeeds", async () => {
    const results = await Promise.allSettled([book(a.id, at(9)), book(b.id, at(9))]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.ok(rejected.reason instanceof booking.BookingError, String(rejected.reason));
  });

  await test("the taken slot disappears from availability", async () => {
    const { slots } = await booking.getSlotsForService(svc.id, at(0), at(23, 59));
    assert.ok(!slots.some((x) => x.getTime() === at(9).getTime()));
  });

  await test("rejects a start time that isn't an offered slot (off-grid / outside hours / inside buffer)", async () => {
    await assert.rejects(book(c.id, at(9, 30)), booking.BookingError);
    await assert.rejects(book(c.id, at(13)), booking.BookingError);
    await assert.rejects(book(c.id, at(8)), booking.BookingError);
  });

  await test("rejects weekends (no weekly hours)", async () => {
    await assert.rejects(book(c.id, at(9, 0, -1)), booking.BookingError); // Sunday
  });

  await test("respects blocked dates (leave)", async () => {
    const day = at(0, 0, 1).toISOString().slice(0, 10); // Tuesday
    const [o] = await db.insert(s.availabilityOverrides).values({ psychologistId: psych.id, kind: "blocked", startDate: day, endDate: day, reason: "Leave" }).returning();
    await assert.rejects(book(c.id, at(9, 0, 1)), booking.BookingError);
    await db.delete(s.availabilityOverrides).where(eq(s.availabilityOverrides.id, o.id));
  });

  await test("custom hours replace weekly hours for that date", async () => {
    const day = at(0, 0, 2).toISOString().slice(0, 10); // Wednesday
    await db.insert(s.availabilityOverrides).values({ psychologistId: psych.id, kind: "custom_hours", startDate: day, endDate: day, startMinute: 900, endMinute: 960 });
    await assert.rejects(book(c.id, at(9, 0, 2)), booking.BookingError);
    const ok = await book(c.id, at(15, 0, 2));
    assert.equal(ok.status, "confirmed");
  });

  await test("a client can't hold two overlapping sessions", async () => {
    const [p2] = await db.insert(s.users).values({ email: "p2@t.test", name: "Second Psy", role: "psychologist", emailVerifiedAt: new Date() }).returning();
    await db.insert(s.psychologistProfiles).values({ userId: p2.id, licenseNumber: "T2", verificationStatus: "approved", minNoticeHours: 0, autoConfirm: true });
    const [svc2] = await db.insert(s.services).values({ psychologistId: p2.id, name: "Therapy", durationMinutes: 50, priceMinor: 1, modes: ["online"] }).returning();
    await db.insert(s.availabilityRules).values({ psychologistId: p2.id, weekday: d.getUTCDay(), startMinute: 540, endMinute: 720 });
    const winner = (await db.select().from(s.appointments).where(eq(s.appointments.startsAt, at(9))))[0];
    await assert.rejects(booking.createBooking({ clientId: winner.clientId, serviceId: svc2.id, startsAt: at(9), mode: "online", clientTimezone: "UTC" }), booking.BookingError);
  });

  await test("unverified emails and non-client roles can't book", async () => {
    await assert.rejects(book(unverified.id, at(10)), /confirm your email/);
    await assert.rejects(book(psych.id, at(10)), /Only client accounts/);
  });

  await test("unverified or suspended psychologists can't be booked", async () => {
    await db.update(s.psychologistProfiles).set({ verificationStatus: "needs_info" }).where(eq(s.psychologistProfiles.userId, psych.id));
    await assert.rejects(book(c.id, at(10)), /isn't taking bookings/);
    await db.update(s.psychologistProfiles).set({ verificationStatus: "approved" }).where(eq(s.psychologistProfiles.userId, psych.id));
    await db.update(s.users).set({ status: "suspended" }).where(eq(s.users.id, psych.id));
    await assert.rejects(book(c.id, at(10)), /isn't taking bookings/);
    await db.update(s.users).set({ status: "active" }).where(eq(s.users.id, psych.id));
  });

  await test("time zones: a New York client's booking is stored as the same instant", async () => {
    const r = await book(c.id, at(10), "America/New_York");
    const [row] = await db.select().from(s.appointments).where(eq(s.appointments.id, r.id));
    assert.equal(row.startsAt.toISOString(), at(10).toISOString());
    assert.equal(row.clientTimezone, "America/New_York");
  });

  await test("reschedule: moves to a free slot, rejects taken ones, counts moves", async () => {
    const [mine] = await db.select().from(s.appointments).where(eq(s.appointments.startsAt, at(10)));
    await assert.rejects(booking.clientReschedule(mine.id, mine.clientId, at(9)), booking.BookingError); // taken
    await booking.clientReschedule(mine.id, mine.clientId, at(11));
    const [moved] = await db.select().from(s.appointments).where(eq(s.appointments.id, mine.id));
    assert.equal(moved.startsAt.toISOString(), at(11).toISOString());
    assert.equal(moved.rescheduleCount, 1);
    await assert.rejects(booking.clientReschedule(mine.id, a.id === mine.clientId ? b.id : a.id, at(10)), /not found/); // someone else's
  });

  await test("cancelling frees the slot for others", async () => {
    const [mine] = await db.select().from(s.appointments).where(eq(s.appointments.startsAt, at(11)));
    await booking.clientCancel(mine.id, mine.clientId, "test");
    const r = await book(a.id, at(11));
    assert.equal(r.status, "confirmed");
  });

  await test("outcomes can't be recorded before a session starts", async () => {
    const { and } = await import("drizzle-orm");
    const [future] = await db.select().from(s.appointments).where(and(eq(s.appointments.startsAt, at(11)), eq(s.appointments.status, "confirmed")));
    await assert.rejects(booking.psychologistMarkOutcome(future.id, psych.id, "completed"), /once the session has started/);
  });

  await test("stale pending requests are released", async () => {
    const soon = new Date(Date.now() + 30 * 60_000);
    await db.insert(s.appointments).values({ clientId: b.id, psychologistId: psych.id, serviceName: "x", durationMinutes: 50, priceMinor: 0, mode: "online", startsAt: soon, endsAt: new Date(soon.getTime() + 50 * 60_000), clientTimezone: "UTC", status: "pending" });
    assert.ok((await booking.releaseStaleRequests()) >= 1);
  });

  console.log("\nRate limiting & read models");
  const { rateLimit, clearRateLimit } = await import("../src/lib/server/rate-limit");
  const directory = await import("../src/lib/server/directory");
  const admin = await import("../src/lib/server/admin");
  const practice = await import("../src/lib/server/practice");
  const appts = await import("../src/lib/server/appointments-query");
  const { unreadCount, listNotifications } = await import("../src/lib/server/notifications");
  const { getSettings } = await import("../src/lib/server/settings");
  const { logActivity, notify } = await import("../src/lib/server/audit");

  await test("rate limiter counts within a window and blocks after the limit", async () => {
    const key = `test:${Date.now()}`;
    for (let i = 1; i <= 3; i++) assert.equal((await rateLimit(key, 3, 60)).ok, true);
    assert.equal((await rateLimit(key, 3, 60)).ok, false);
    await clearRateLimit(key);
    assert.equal((await rateLimit(key, 3, 60)).ok, true);
  });

  await test("directory search, filters, profile and recently viewed", async () => {
    const all = await directory.searchPsychologists({ sort: "soonest" });
    assert.ok(all.some((p) => p.id === psych.id));
    const filtered = await directory.searchPsychologists({ q: "Psy", lang: "English", mode: "online", maxPrice: 500, minExp: 0, available: "week", sort: "price" });
    assert.ok(Array.isArray(filtered));
    assert.ok(await directory.getPsychologistProfile(psych.id));
    await directory.recordProfileView(a.id, psych.id);
    await directory.recordProfileView(a.id, psych.id);
    assert.equal((await directory.recentlyViewed(a.id)).length, 1);
    assert.ok(Array.isArray(await directory.recommendedFor(a.id)));
  });

  await test("admin read models", async () => {
    await logActivity({ actorId: a.id, action: "auth.login", entityType: "user", entityId: a.id, metadata: { test: true } });
    const k = await admin.platformKpis();
    assert.ok(k.users >= 4 && k.appointments >= 1);
    const t = await admin.weeklyTrends(12);
    assert.equal(t.bookings.length, 12);
    assert.equal(t.signups.length, 12);
    assert.ok((await admin.listUsers({ q: "t.test", role: "client", page: 1 })).total >= 3);
    assert.ok((await admin.listAppointments({ psychologistId: psych.id, client: "a", status: "confirmed", from: at(0), to: at(23), page: 1 })).rows.length >= 0);
    assert.ok(Array.isArray(await admin.verificationQueue()));
    assert.ok((await admin.recentActivity({ action: "auth.", page: 1 })).total >= 1);
    assert.ok(Array.isArray(await admin.psychologistOptions()));
  });

  await test("practice and client read models", async () => {
    const p = await practice.getPractice(psych.id);
    assert.equal(p.rules.length, 5);
    const st = await practice.practiceStats(psych.id);
    assert.ok(st.total >= 1);
    assert.ok(Array.isArray(await practice.bookingsOnBlockedDays(psych.id, "Africa/Accra")));
    assert.ok(Array.isArray(await practice.overridesFor(psych.id, "2000-01-01")));
    assert.ok(Array.isArray(await practice.verificationHistory(psych.id)));
    assert.ok((await appts.listForClient(a.id, "upcoming")).length >= 1);
    assert.ok(Array.isArray(await appts.listForClient(a.id, "past")));
    const list = await appts.listForPsychologist(psych.id, { from: new Date(), statuses: ["confirmed"] });
    assert.ok(await appts.getAppointmentFor(list[0].id, psych.id, "psychologist"));
    await notify(a.id, { type: "test", title: "Hello" });
    assert.ok((await unreadCount(a.id)) >= 1);
    assert.ok((await listNotifications(a.id)).length >= 1);
    assert.equal((await getSettings()).cancellationWindowHours, 24);
    assert.ok(await booking.sendReminders() >= 0);
  });

  console.log(`\n${passed} passed${process.exitCode ? ", some FAILED" : ""}`);
  if (!REAL) fs.rmSync(DIR, { recursive: true, force: true });
  process.exit(process.exitCode ?? 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
