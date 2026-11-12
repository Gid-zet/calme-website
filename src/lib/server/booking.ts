import "server-only";
import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { getDb, type Database } from "@/db";
import { appointments, availabilityOverrides, availabilityRules, psychologistProfiles, services, users, type AppointmentStatus } from "@/db/schema";
import { formatDateTime, MODE_LABEL } from "@/lib/format";
import { computeSlots, coveringDates, isSlotAvailable, type ScheduleInput } from "@/lib/scheduling/slots";
import { localDateOf } from "@/lib/scheduling/time";
import { logActivity, notify } from "./audit";
import { emails, sendEmail } from "./email";
import { appUrl } from "./request";
import { getSettings } from "./settings";

export class BookingError extends Error {}

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Q = Database | Tx;

const ACTIVE: AppointmentStatus[] = ["pending", "confirmed"];

function isOverlapError(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23P01" || e?.cause?.code === "23P01";
}

/** Everything the slot engine needs for one psychologist, read inside the caller's transaction. */
async function loadSchedule(q: Q, psychologistId: string, from: Date, to: Date, excludeAppointmentId?: string) {
  const [profile] = await q.select().from(psychologistProfiles).where(eq(psychologistProfiles.userId, psychologistId)).limit(1);
  if (!profile) throw new BookingError("Psychologist not found.");
  const [rules, overrides, busy] = await Promise.all([
    q.select().from(availabilityRules).where(eq(availabilityRules.psychologistId, psychologistId)),
    q.select().from(availabilityOverrides).where(eq(availabilityOverrides.psychologistId, psychologistId)),
    q
      .select({ start: appointments.startsAt, end: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.psychologistId, psychologistId),
          inArray(appointments.status, ACTIVE),
          lt(appointments.startsAt, new Date(to.getTime() + 86400_000)),
          gt(appointments.endsAt, new Date(from.getTime() - 86400_000)),
          excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : undefined,
        ),
      ),
  ]);
  return { profile, rules, overrides, busy };
}

function scheduleInput(s: Awaited<ReturnType<typeof loadSchedule>>, durationMinutes: number, now = new Date(), opts: { ignoreNotice?: boolean } = {}): ScheduleInput {
  return {
    timeZone: s.profile.timezone,
    rules: s.rules,
    overrides: s.overrides.map((o) => ({ ...o, kind: o.kind })) as ScheduleInput["overrides"],
    busy: s.busy,
    durationMinutes,
    bufferMinutes: s.profile.bufferMinutes,
    minNoticeHours: opts.ignoreNotice ? 0 : s.profile.minNoticeHours,
    maxAdvanceDays: s.profile.maxAdvanceDays,
    now,
  };
}

/** A psychologist can take bookings only when verified, active and accepting clients. */
export async function isBookable(q: Q, psychologistId: string) {
  const [row] = await q
    .select({ status: users.status, verification: psychologistProfiles.verificationStatus, accepting: psychologistProfiles.acceptingClients })
    .from(psychologistProfiles)
    .innerJoin(users, eq(users.id, psychologistProfiles.userId))
    .where(eq(psychologistProfiles.userId, psychologistId))
    .limit(1);
  return Boolean(row && row.status === "active" && row.verification === "approved" && row.accepting);
}

/** Open start times for a service between two instants. Public: used by profiles and the booking flow. */
export async function getSlotsForService(serviceId: string, from: Date, to: Date, opts: { excludeAppointmentId?: string; ignoreNotice?: boolean } = {}) {
  const db = await getDb();
  const [service] = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.active, true))).limit(1);
  if (!service) return { service: null, slots: [] as Date[], timeZone: "Africa/Accra" };
  const s = await loadSchedule(db, service.psychologistId, from, to, opts.excludeAppointmentId);
  const range = coveringDates(from, to, s.profile.timezone);
  const slots = computeSlots(scheduleInput(s, service.durationMinutes, new Date(), opts), range.from, range.to).filter((d) => d >= from && d <= to);
  return { service, slots, timeZone: s.profile.timezone };
}

export function getSlotsForNextDays(serviceId: string, days: number) {
  const from = new Date();
  return getSlotsForService(serviceId, from, new Date(from.getTime() + days * 86400_000));
}

/** First open slot (any active service, shortest first) in the next `days` days, for directory cards. */
export async function nextAvailableSlot(psychologistId: string, durationMinutes: number, days = 21) {
  const db = await getDb();
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400_000);
  const s = await loadSchedule(db, psychologistId, from, to);
  const range = coveringDates(from, to, s.profile.timezone);
  return computeSlots(scheduleInput(s, durationMinutes), range.from, range.to).find((d) => d >= from) ?? null;
}

/* ───────────── Notifications ───────────── */

async function announce(
  appointmentId: string,
  to: "client" | "psychologist" | "both",
  type: string,
  headline: (who: "client" | "psychologist") => string,
  detail?: string,
) {
  const db = await getDb();
  const [a] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      mode: appointments.mode,
      serviceName: appointments.serviceName,
      clientId: appointments.clientId,
      psychologistId: appointments.psychologistId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId));
  const people = await db.select({ id: users.id, name: users.name, email: users.email, timezone: users.timezone }).from(users).where(inArray(users.id, [a.clientId, a.psychologistId]));
  const client = people.find((p) => p.id === a.clientId)!;
  const psych = people.find((p) => p.id === a.psychologistId)!;
  const base = await appUrl();
  const targets: ("client" | "psychologist")[] = to === "both" ? ["client", "psychologist"] : [to];
  for (const who of targets) {
    const person = who === "client" ? client : psych;
    const other = who === "client" ? psych : client;
    const link = who === "client" ? `/dashboard/appointments/${a.id}` : `/practice/appointments/${a.id}`;
    const when = formatDateTime(a.startsAt, person.timezone);
    const title = headline(who);
    const body = `${a.serviceName} with ${other.name} · ${when} (${person.timezone}) · ${MODE_LABEL[a.mode]}`;
    await notify(person.id, { type, title, body: detail ? `${body}. ${detail}` : body, link });
    const m = emails.generic(title, [body, ...(detail ? [detail] : [])], { label: "View appointment", url: `${base}${link}` });
    await sendEmail(person.email, m.subject, m.html, m.text);
  }
}

/* ───────────── Client actions ───────────── */

export async function createBooking(input: {
  clientId: string;
  serviceId: string;
  startsAt: Date;
  mode: "online" | "in_person";
  clientNote?: string;
  clientTimezone: string;
}) {
  const db = await getDb();
  const [client] = await db.select().from(users).where(eq(users.id, input.clientId)).limit(1);
  if (!client || client.role !== "client" || client.status !== "active") throw new BookingError("Only client accounts can book sessions.");
  if (!client.emailVerifiedAt) throw new BookingError("Please confirm your email address before booking.");

  const [service] = await db.select().from(services).where(and(eq(services.id, input.serviceId), eq(services.active, true))).limit(1);
  if (!service) throw new BookingError("This service is no longer available.");
  if (!service.modes.includes(input.mode)) throw new BookingError("That consultation method isn't offered for this service.");

  let created: { id: string; status: AppointmentStatus };
  try {
    created = await db.transaction(async (tx) => {
      // Serialise bookings per psychologist so two requests can't both pass the check below.
      await tx.select({ id: psychologistProfiles.userId }).from(psychologistProfiles).where(eq(psychologistProfiles.userId, service.psychologistId)).for("update");
      if (!(await isBookable(tx, service.psychologistId))) throw new BookingError("This psychologist isn't taking bookings right now.");

      const endsAt = new Date(input.startsAt.getTime() + service.durationMinutes * 60_000);
      const s = await loadSchedule(tx, service.psychologistId, input.startsAt, endsAt);
      if (!isSlotAvailable(scheduleInput(s, service.durationMinutes), input.startsAt)) {
        throw new BookingError("Sorry, that time was just taken or is no longer available. Please pick another slot.");
      }
      const status: AppointmentStatus = s.profile.autoConfirm ? "confirmed" : "pending";
      const [row] = await tx
        .insert(appointments)
        .values({
          clientId: client.id,
          psychologistId: service.psychologistId,
          serviceId: service.id,
          serviceName: service.name,
          durationMinutes: service.durationMinutes,
          priceMinor: service.priceMinor,
          currency: service.currency,
          mode: input.mode,
          startsAt: input.startsAt,
          endsAt,
          clientTimezone: input.clientTimezone,
          clientNote: input.clientNote?.trim() || null,
          status,
          confirmedAt: status === "confirmed" ? new Date() : null,
        })
        .returning({ id: appointments.id, status: appointments.status });
      return row;
    });
  } catch (err) {
    if (isOverlapError(err)) throw new BookingError("That time overlaps another session (yours or the psychologist's). Please pick another slot.");
    throw err;
  }

  await logActivity({ actorId: client.id, action: "appointment.booked", entityType: "appointment", entityId: created.id, metadata: { status: created.status } });
  if (created.status === "confirmed") {
    await announce(created.id, "both", "appointment.confirmed", (w) => (w === "client" ? "Your session is confirmed" : "New session booked"));
  } else {
    await announce(created.id, "client", "appointment.requested", () => "Booking request sent", "Your psychologist will confirm shortly.");
    await announce(created.id, "psychologist", "appointment.requested", () => "New booking request");
  }
  return created;
}

async function getOwned(appointmentId: string, userId: string, as: "client" | "psychologist") {
  const db = await getDb();
  const [a] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), as === "client" ? eq(appointments.clientId, userId) : eq(appointments.psychologistId, userId)))
    .limit(1);
  if (!a) throw new BookingError("Appointment not found.");
  return a;
}

export async function clientCancel(appointmentId: string, clientId: string, reason?: string) {
  const a = await getOwned(appointmentId, clientId, "client");
  if (!ACTIVE.includes(a.status)) throw new BookingError("This appointment can't be cancelled.");
  if (a.startsAt <= new Date()) throw new BookingError("This session has already started.");
  const settings = await getSettings();
  const late = a.status === "confirmed" && a.startsAt.getTime() - Date.now() < settings.cancellationWindowHours * 3600_000;
  const db = await getDb();
  await db
    .update(appointments)
    .set({ status: "cancelled", cancelledById: clientId, cancelReason: reason?.trim() || null, cancelledAt: new Date(), lateCancellation: late, updatedAt: new Date() })
    .where(and(eq(appointments.id, a.id), inArray(appointments.status, ACTIVE)));
  await logActivity({ actorId: clientId, action: "appointment.cancelled", entityType: "appointment", entityId: a.id, metadata: { by: "client", late } });
  await announce(a.id, "psychologist", "appointment.cancelled", () => "A client cancelled a session", late ? "This was a late cancellation." : undefined);
  return { late };
}

export async function clientReschedule(appointmentId: string, clientId: string, newStart: Date) {
  const a = await getOwned(appointmentId, clientId, "client");
  if (!ACTIVE.includes(a.status)) throw new BookingError("Only upcoming appointments can be rescheduled.");
  const settings = await getSettings();
  if (a.startsAt.getTime() - Date.now() < settings.cancellationWindowHours * 3600_000) {
    throw new BookingError(`Appointments can only be rescheduled more than ${settings.cancellationWindowHours} hours in advance.`);
  }
  if (a.rescheduleCount >= settings.maxReschedules) throw new BookingError(`You've already rescheduled this appointment ${settings.maxReschedules} times.`);
  await moveAppointment(a, newStart, clientId, false);
  await logActivity({ actorId: clientId, action: "appointment.rescheduled", entityType: "appointment", entityId: a.id, metadata: { by: "client" } });
  await announce(a.id, "psychologist", "appointment.rescheduled", () => "A client rescheduled a session");
}

/** Moves an appointment to a new start time after re-validating availability (excluding itself). */
async function moveAppointment(a: typeof appointments.$inferSelect, newStart: Date, actorId: string, byPsychologist: boolean) {
  const db = await getDb();
  const newEnd = new Date(newStart.getTime() + a.durationMinutes * 60_000);
  try {
    await db.transaction(async (tx) => {
      await tx.select({ id: psychologistProfiles.userId }).from(psychologistProfiles).where(eq(psychologistProfiles.userId, a.psychologistId)).for("update");
      const s = await loadSchedule(tx, a.psychologistId, newStart, newEnd, a.id);
      if (!isSlotAvailable(scheduleInput(s, a.durationMinutes, new Date(), { ignoreNotice: byPsychologist }), newStart)) {
        throw new BookingError("That time isn't available. Please choose another slot.");
      }
      const status: AppointmentStatus = byPsychologist || s.profile.autoConfirm ? "confirmed" : "pending";
      await tx
        .update(appointments)
        .set({
          startsAt: newStart,
          endsAt: newEnd,
          status,
          confirmedAt: status === "confirmed" ? new Date() : null,
          rescheduleCount: byPsychologist ? a.rescheduleCount : a.rescheduleCount + 1,
          reminderSentAt: null,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, a.id));
    });
  } catch (err) {
    if (isOverlapError(err)) throw new BookingError("That time overlaps another session. Please choose another slot.");
    throw err;
  }
  void actorId;
}

/* ───────────── Psychologist actions ───────────── */

export async function psychologistRespond(appointmentId: string, psychologistId: string, decision: "accept" | "decline", reason?: string) {
  const a = await getOwned(appointmentId, psychologistId, "psychologist");
  if (a.status !== "pending") throw new BookingError("Only pending requests can be accepted or declined.");
  if (decision === "decline" && !reason?.trim()) throw new BookingError("Please give the client a short reason.");
  const db = await getDb();
  await db
    .update(appointments)
    .set(
      decision === "accept"
        ? { status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() }
        : { status: "declined", cancelledById: psychologistId, cancelReason: reason!.trim(), cancelledAt: new Date(), updatedAt: new Date() },
    )
    .where(and(eq(appointments.id, a.id), eq(appointments.status, "pending")));
  await logActivity({ actorId: psychologistId, action: `appointment.${decision === "accept" ? "confirmed" : "declined"}`, entityType: "appointment", entityId: a.id });
  await announce(
    a.id,
    "client",
    decision === "accept" ? "appointment.confirmed" : "appointment.declined",
    () => (decision === "accept" ? "Your session is confirmed" : "Your booking request was declined"),
    decision === "decline" ? `Reason: ${reason!.trim()}` : undefined,
  );
}

export async function psychologistCancel(appointmentId: string, psychologistId: string, reason: string) {
  const a = await getOwned(appointmentId, psychologistId, "psychologist");
  if (!ACTIVE.includes(a.status)) throw new BookingError("This appointment can't be cancelled.");
  if (!reason.trim()) throw new BookingError("Please give the client a reason for cancelling.");
  const db = await getDb();
  await db
    .update(appointments)
    .set({ status: "cancelled", cancelledById: psychologistId, cancelReason: reason.trim(), cancelledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(appointments.id, a.id), inArray(appointments.status, ACTIVE)));
  await logActivity({ actorId: psychologistId, action: "appointment.cancelled", entityType: "appointment", entityId: a.id, metadata: { by: "psychologist" } });
  await announce(a.id, "client", "appointment.cancelled", () => "Your psychologist cancelled a session", `Reason: ${reason.trim()}`);
}

export async function psychologistReschedule(appointmentId: string, psychologistId: string, newStart: Date) {
  const a = await getOwned(appointmentId, psychologistId, "psychologist");
  if (!ACTIVE.includes(a.status)) throw new BookingError("Only upcoming appointments can be rescheduled.");
  if (newStart <= new Date()) throw new BookingError("Choose a time in the future.");
  await moveAppointment(a, newStart, psychologistId, true);
  await logActivity({ actorId: psychologistId, action: "appointment.rescheduled", entityType: "appointment", entityId: a.id, metadata: { by: "psychologist" } });
  await announce(a.id, "client", "appointment.rescheduled", () => "Your session has a new time");
}

export async function psychologistMarkOutcome(appointmentId: string, psychologistId: string, outcome: "completed" | "no_show") {
  const a = await getOwned(appointmentId, psychologistId, "psychologist");
  if (a.status !== "confirmed") throw new BookingError("Only confirmed sessions can be marked as completed or no-show.");
  if (a.startsAt > new Date()) throw new BookingError("You can record the outcome once the session has started.");
  const db = await getDb();
  await db.update(appointments).set({ status: outcome, updatedAt: new Date() }).where(eq(appointments.id, a.id));
  await logActivity({ actorId: psychologistId, action: `appointment.${outcome}`, entityType: "appointment", entityId: a.id });
  if (outcome === "completed") {
    await notify(a.clientId, { type: "review.invite", title: "How was your session?", body: "Leave a short review to help others find the right support.", link: `/dashboard/appointments/${a.id}` });
  }
}

export async function psychologistSetMeetingDetails(appointmentId: string, psychologistId: string, details: string) {
  const a = await getOwned(appointmentId, psychologistId, "psychologist");
  const db = await getDb();
  await db.update(appointments).set({ meetingDetails: details.trim().slice(0, 500) || null, updatedAt: new Date() }).where(eq(appointments.id, a.id));
}

/* ───────────── Housekeeping ───────────── */

/** Releases booking requests nobody confirmed before they were due. Idempotent; called lazily and by cron. */
export async function releaseStaleRequests() {
  const db = await getDb();
  const settings = await getSettings();
  const cutoff = new Date(Date.now() + settings.pendingReleaseHours * 3600_000);
  const released = await db
    .update(appointments)
    .set({ status: "cancelled", cancelReason: "Request expired: it wasn't confirmed in time.", cancelledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(appointments.status, "pending"), lt(appointments.startsAt, cutoff)))
    .returning({ id: appointments.id, clientId: appointments.clientId });
  for (const r of released) {
    await notify(r.clientId, { type: "appointment.expired", title: "A booking request expired", body: "It wasn't confirmed in time, so the slot was released. Please book another time.", link: `/dashboard/appointments/${r.id}` });
  }
  return released.length;
}

/** Sends 24-hour reminders for confirmed sessions. Called by the cron route. */
export async function sendReminders() {
  const db = await getDb();
  const now = new Date();
  const due = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "confirmed"),
        sql`${appointments.reminderSentAt} IS NULL`,
        gt(appointments.startsAt, now),
        lt(appointments.startsAt, new Date(now.getTime() + 24 * 3600_000)),
      ),
    );
  for (const d of due) {
    await announce(d.id, "both", "appointment.reminder", () => "Reminder: you have a session soon");
    await db.update(appointments).set({ reminderSentAt: new Date() }).where(eq(appointments.id, d.id));
  }
  return due.length;
}

export { localDateOf };
