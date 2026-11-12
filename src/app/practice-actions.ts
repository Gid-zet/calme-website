"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import {
  appointments,
  availabilityOverrides,
  availabilityRules,
  credentials,
  psychologistProfiles,
  psychologistSpecializations,
  services,
  specializations,
  users,
  verificationRequests,
} from "@/db/schema";
import { logActivity, notify } from "@/lib/server/audit";
import { requireRole } from "@/lib/server/auth";
import {
  BookingError,
  psychologistCancel,
  psychologistMarkOutcome,
  psychologistReschedule,
  psychologistRespond,
  psychologistSetMeetingDetails,
} from "@/lib/server/booking";
import { saveUpload, UploadError } from "@/lib/server/files";
import { hhmmToMinutes, isLocalDate, isValidTimeZone } from "@/lib/scheduling/time";
import { credentialSchema, fieldErrors, serviceSchema, type FormState } from "@/lib/validation";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function attempt(fn: () => Promise<string | void>): Promise<Result> {
  try {
    const message = await fn();
    revalidatePath("/practice", "layout");
    return { ok: true, message: message ?? undefined };
  } catch (e) {
    if (e instanceof BookingError || e instanceof UploadError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const uuid = z.uuid("Invalid id.");

/* ───────────── Appointments ───────────── */

export async function respondToRequest(id: string, decision: "accept" | "decline", reason?: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    await psychologistRespond(uuid.parse(id), me.id, decision, reason?.slice(0, 500));
    return decision === "accept" ? "Request accepted. The client has been notified." : "Request declined. The client has been notified.";
  });
}

export async function cancelAsPsychologist(id: string, reason: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    await psychologistCancel(uuid.parse(id), me.id, reason.slice(0, 500));
    return "Appointment cancelled. The client has been notified.";
  });
}

export async function rescheduleAsPsychologist(id: string, startsAt: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    await psychologistReschedule(uuid.parse(id), me.id, new Date(z.iso.datetime().parse(startsAt)));
    return "Appointment moved. The client has been notified.";
  });
}

export async function recordOutcome(id: string, outcome: "completed" | "no_show") {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    await psychologistMarkOutcome(uuid.parse(id), me.id, z.enum(["completed", "no_show"]).parse(outcome));
    return outcome === "completed" ? "Marked as completed." : "Marked as no-show.";
  });
}

export async function saveMeetingDetails(id: string, details: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    await psychologistSetMeetingDetails(uuid.parse(id), me.id, details);
    return "Saved. The client can see these details on their appointment page.";
  });
}

/* ───────────── Availability ───────────── */

const periodSchema = z.object({ weekday: z.number().int().min(0).max(6), start: z.string(), end: z.string() });

export async function saveWeeklyHours(periods: z.input<typeof periodSchema>[]) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const rows = z.array(periodSchema).max(70).parse(periods).map((p) => {
      const s = hhmmToMinutes(p.start);
      const e = hhmmToMinutes(p.end);
      if (s == null || e == null) throw new BookingError("Use times like 09:00.");
      if (s >= e) throw new BookingError("Each period must end after it starts.");
      return { psychologistId: me.id, weekday: p.weekday, startMinute: s, endMinute: e };
    });
    for (let d = 0; d < 7; d++) {
      const day = rows.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < day.length; i++) if (day[i].startMinute < day[i - 1].endMinute) throw new BookingError("Periods on the same day can't overlap.");
    }
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.delete(availabilityRules).where(eq(availabilityRules.psychologistId, me.id));
      if (rows.length) await tx.insert(availabilityRules).values(rows);
    });
    await logActivity({ actorId: me.id, action: "availability.weekly_updated", entityType: "psychologist", entityId: me.id, metadata: { periods: rows.length } });
    return "Weekly hours saved. Existing bookings are unaffected.";
  });
}

const settingsSchema = z.object({
  bufferMinutes: z.coerce.number().int().min(0, "Break can't be negative.").max(120, "Break can be at most 120 minutes."),
  minNoticeHours: z.coerce.number().int().min(0).max(336, "Notice can be at most 14 days."),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  timezone: z.string().refine(isValidTimeZone, "Unknown time zone."),
  autoConfirm: z.boolean(),
  acceptingClients: z.boolean(),
});

export async function saveSchedulingSettings(input: z.input<typeof settingsSchema>) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const d = settingsSchema.parse(input);
    const db = await getDb();
    await db.update(psychologistProfiles).set({ ...d, updatedAt: new Date() }).where(eq(psychologistProfiles.userId, me.id));
    return "Booking rules saved.";
  });
}

const overrideSchema = z.object({
  kind: z.enum(["blocked", "custom_hours"]),
  startDate: z.string().refine(isLocalDate, "Choose a valid date."),
  endDate: z.string().refine(isLocalDate, "Choose a valid date."),
  start: z.string().optional(),
  end: z.string().optional(),
  reason: z.string().trim().max(120).optional(),
});

export async function addOverride(input: z.input<typeof overrideSchema>) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const o = overrideSchema.parse(input);
    const db = await getDb();
    if (o.kind === "blocked") {
      if (o.endDate < o.startDate) throw new BookingError("The end date must be on or after the start date.");
      const span = (Date.parse(o.endDate) - Date.parse(o.startDate)) / 86400_000;
      if (span > 366) throw new BookingError("Time off can be at most a year at a time.");
      await db.insert(availabilityOverrides).values({ psychologistId: me.id, kind: "blocked", startDate: o.startDate, endDate: o.endDate, reason: o.reason || null });
    } else {
      const s = hhmmToMinutes(o.start ?? "");
      const e = hhmmToMinutes(o.end ?? "");
      if (s == null || e == null || s >= e) throw new BookingError("Enter a start and end time, e.g. 10:00 – 14:00.");
      await db.insert(availabilityOverrides).values({ psychologistId: me.id, kind: "custom_hours", startDate: o.startDate, endDate: o.startDate, startMinute: s, endMinute: e, reason: o.reason || null });
    }
    // Existing appointments are never removed automatically; flag conflicts so the psychologist can act.
    return o.kind === "blocked" ? "Time off added. Check your schedule for any sessions already booked on those dates." : "Custom hours added for that date.";
  });
}

export async function deleteOverride(id: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const db = await getDb();
    await db.delete(availabilityOverrides).where(and(eq(availabilityOverrides.id, uuid.parse(id)), eq(availabilityOverrides.psychologistId, me.id)));
    return "Removed.";
  });
}

/* ───────────── Services ───────────── */

export async function saveService(id: string | null, input: Record<string, unknown>): Promise<FormState> {
  const me = await requireRole("psychologist");
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const values = { name: d.name, description: d.description ?? null, durationMinutes: d.durationMinutes, priceMinor: Math.round(d.price * 100), modes: d.modes, active: d.active };
  const db = await getDb();
  if (id) {
    const updated = await db
      .update(services)
      .set(values)
      .where(and(eq(services.id, uuid.parse(id)), eq(services.psychologistId, me.id)))
      .returning({ id: services.id });
    if (!updated.length) return { message: "Service not found." };
  } else {
    const [{ n }] = await db.select({ n: count() }).from(services).where(eq(services.psychologistId, me.id));
    if (n >= 12) return { message: "You can offer up to 12 services." };
    await db.insert(services).values({ ...values, psychologistId: me.id });
  }
  revalidatePath("/practice", "layout");
  return { ok: true, message: id ? "Service updated. Booked sessions keep their original price and length." : "Service added." };
}

export async function deleteService(id: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const db = await getDb();
    const sid = uuid.parse(id);
    const [{ n }] = await db.select({ n: count() }).from(appointments).where(eq(appointments.serviceId, sid));
    if (n > 0) {
      // Keep history intact: deactivate instead of deleting.
      await db.update(services).set({ active: false }).where(and(eq(services.id, sid), eq(services.psychologistId, me.id)));
      return "This service has bookings, so it was hidden instead of deleted.";
    }
    await db.delete(services).where(and(eq(services.id, sid), eq(services.psychologistId, me.id)));
    return "Service deleted.";
  });
}

/* ───────────── Profile & credentials ───────────── */

const profileSchema = z.object({
  title: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(80, "Your biography should be at least 80 characters.").max(2000),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  location: z.string().trim().max(120).optional(),
  languages: z.array(z.string().trim().min(2).max(40)).min(1, "Choose at least one language.").max(10),
  specializationIds: z.array(z.uuid()).min(1, "Choose at least one specialisation.").max(12),
  licenseExpiresOn: z.preprocess((v) => (v === "" ? undefined : v), z.iso.date().optional()),
});

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireRole("psychologist");
  const parsed = profileSchema.safeParse({ ...Object.fromEntries(form), languages: form.getAll("languages"), specializationIds: form.getAll("specializationIds") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const db = await getDb();
  const valid = await db.select({ id: specializations.id }).from(specializations).where(and(inArray(specializations.id, d.specializationIds), eq(specializations.active, true)));
  await db.transaction(async (tx) => {
    await tx
      .update(psychologistProfiles)
      .set({ title: d.title, bio: d.bio, yearsExperience: d.yearsExperience, location: d.location || null, languages: d.languages, licenseExpiresOn: d.licenseExpiresOn ?? null, updatedAt: new Date() })
      .where(eq(psychologistProfiles.userId, me.id));
    await tx.delete(psychologistSpecializations).where(eq(psychologistSpecializations.psychologistId, me.id));
    if (valid.length) await tx.insert(psychologistSpecializations).values(valid.map((v) => ({ psychologistId: me.id, specializationId: v.id })));
  });
  revalidatePath("/practice", "layout");
  revalidatePath(`/psychologists/${me.id}`);
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatar(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireRole("psychologist");
  try {
    const fileId = await saveUpload(form.get("photo") as File, me.id, "avatar");
    const db = await getDb();
    await db.update(users).set({ avatarFileId: fileId, updatedAt: new Date() }).where(eq(users.id, me.id));
  } catch (e) {
    if (e instanceof UploadError) return { errors: { photo: e.message } };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Photo updated." };
}

export async function addCredential(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireRole("psychologist");
  const parsed = credentialSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  let documentFileId: string | null = null;
  const doc = form.get("document");
  try {
    if (doc instanceof File && doc.size > 0) documentFileId = await saveUpload(doc, me.id, "credential_document");
  } catch (e) {
    if (e instanceof UploadError) return { errors: { document: e.message } };
    throw e;
  }
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(credentials).where(eq(credentials.psychologistId, me.id));
  if (n >= 15) return { message: "You can list up to 15 qualifications." };
  await db.insert(credentials).values({ psychologistId: me.id, kind: parsed.data.kind, title: parsed.data.title, institution: parsed.data.institution ?? null, year: parsed.data.year ?? null, documentFileId });
  revalidatePath("/practice", "layout");
  return { ok: true, message: "Qualification added." };
}

export async function removeCredential(id: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const db = await getDb();
    const [{ n }] = await db.select({ n: count() }).from(credentials).where(eq(credentials.psychologistId, me.id));
    if (n <= 1) throw new BookingError("Keep at least one qualification on your profile.");
    await db.delete(credentials).where(and(eq(credentials.id, uuid.parse(id)), eq(credentials.psychologistId, me.id)));
    return "Qualification removed.";
  });
}

/** After an admin asks for more information (or rejects), the psychologist can respond and resubmit. */
export async function resubmitVerification(note: string) {
  const me = await requireRole("psychologist");
  return attempt(async () => {
    const db = await getDb();
    const [p] = await db.select({ status: psychologistProfiles.verificationStatus }).from(psychologistProfiles).where(eq(psychologistProfiles.userId, me.id));
    if (p.status === "approved" || p.status === "pending") throw new BookingError("Your application is already with our team.");
    await db.update(psychologistProfiles).set({ verificationStatus: "pending", updatedAt: new Date() }).where(eq(psychologistProfiles.userId, me.id));
    await db.insert(verificationRequests).values({ psychologistId: me.id, status: "pending", applicantNote: note.trim().slice(0, 1000) || null });
    await logActivity({ actorId: me.id, action: "verification.resubmitted", entityType: "psychologist", entityId: me.id });
    const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.status, "active")));
    for (const a of admins) await notify(a.id, { type: "verification.submitted", title: `${me.name} resubmitted their application`, link: `/admin/psychologists/${me.id}` });
    return "Resubmitted. We'll be in touch soon.";
  });
}
