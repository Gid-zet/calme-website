"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { appointments, reviews, supportReports, users } from "@/db/schema";
import { logActivity, notify } from "@/lib/server/audit";
import { requireRole, requireUser } from "@/lib/server/auth";
import { BookingError, clientCancel, clientReschedule, createBooking } from "@/lib/server/booking";
import { rateLimit } from "@/lib/server/rate-limit";

export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

async function guard<T>(fn: () => Promise<T>): Promise<ActionResult & Partial<T>> {
  try {
    const r = await fn();
    return { ok: true, ...(r as object) } as ActionResult & Partial<T>;
  } catch (e) {
    if (e instanceof BookingError) return { ok: false, error: e.message } as ActionResult & Partial<T>;
    // redirect() and notFound() must propagate
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." } as ActionResult & Partial<T>;
  }
}

const bookSchema = z.object({
  serviceId: z.uuid(),
  startsAt: z.iso.datetime(),
  mode: z.enum(["online", "in_person"]),
  note: z.string().max(1000, "Keep the note under 1000 characters.").optional(),
  timezone: z.string().max(64),
});

export async function bookAppointment(input: z.input<typeof bookSchema>): Promise<ActionResult> {
  const user = await requireRole("client");
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const limit = await rateLimit(`book:${user.id}`, 10, 3600);
  if (!limit.ok) return { ok: false, error: "You've made a lot of bookings in a short time. Please try again later." };
  return guard(async () => {
    const a = await createBooking({
      clientId: user.id,
      serviceId: parsed.data.serviceId,
      startsAt: new Date(parsed.data.startsAt),
      mode: parsed.data.mode,
      clientNote: parsed.data.note,
      clientTimezone: parsed.data.timezone,
    });
    revalidatePath("/dashboard", "layout");
    return { id: a.id };
  });
}

export async function cancelAsClient(appointmentId: string, reason: string): Promise<ActionResult> {
  const user = await requireRole("client");
  return guard(async () => {
    const r = await clientCancel(z.uuid().parse(appointmentId), user.id, reason.slice(0, 500));
    revalidatePath("/dashboard", "layout");
    return { message: r.late ? "Cancelled. Because this was within the cancellation window, it's recorded as a late cancellation." : "Your appointment has been cancelled." };
  });
}

export async function rescheduleAsClient(appointmentId: string, startsAt: string): Promise<ActionResult> {
  const user = await requireRole("client");
  return guard(async () => {
    await clientReschedule(z.uuid().parse(appointmentId), user.id, new Date(z.iso.datetime().parse(startsAt)));
    revalidatePath("/dashboard", "layout");
    return { message: "Your appointment has been moved." };
  });
}

export async function submitReview(appointmentId: string, rating: number, comment: string): Promise<ActionResult> {
  const user = await requireRole("client");
  const r = z.number().int().min(1).max(5).safeParse(rating);
  if (!r.success) return { ok: false, error: "Choose a rating from 1 to 5." };
  const db = await getDb();
  const [a] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), eq(appointments.clientId, user.id), eq(appointments.status, "completed")))
    .limit(1);
  if (!a) return { ok: false, error: "You can review a session once it's completed." };
  const inserted = await db
    .insert(reviews)
    .values({ appointmentId: a.id, clientId: user.id, psychologistId: a.psychologistId, rating: r.data, comment: comment.trim().slice(0, 1000) || null })
    .onConflictDoNothing()
    .returning({ id: reviews.id });
  if (!inserted.length) return { ok: false, error: "You've already reviewed this session." };
  await notify(a.psychologistId, { type: "review.received", title: `New ${r.data}-star review`, link: "/practice" });
  revalidatePath(`/dashboard/appointments/${a.id}`);
  return { ok: true, message: "Thank you for your review." };
}

/** Clients and psychologists can flag a problem with an appointment or the platform. */
export async function reportIssue(input: { appointmentId?: string; category: string; message: string }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({
      appointmentId: z.uuid().optional(),
      category: z.enum(["scheduling", "technical", "conduct", "billing", "other"]),
      message: z.string().trim().min(10, "Please describe the issue in a little more detail.").max(2000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!(await rateLimit(`report:${user.id}`, 5, 3600)).ok) return { ok: false, error: "Please wait before sending another report." };
  const db = await getDb();
  if (parsed.data.appointmentId) {
    const [own] = await db
      .select({ id: appointments.id, c: appointments.clientId, p: appointments.psychologistId })
      .from(appointments)
      .where(eq(appointments.id, parsed.data.appointmentId))
      .limit(1);
    if (!own || (own.c !== user.id && own.p !== user.id)) return { ok: false, error: "Appointment not found." };
  }
  const [row] = await db.insert(supportReports).values({ reporterId: user.id, ...parsed.data }).returning({ id: supportReports.id });
  await logActivity({ actorId: user.id, action: "support.report_created", entityType: "support_report", entityId: row.id, metadata: { category: parsed.data.category } });
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.status, "active")));
  for (const a of admins) await notify(a.id, { type: "support.report", title: `New ${parsed.data.category} report`, link: "/admin/reports" });
  return { ok: true, message: "Thanks. Our team will look into it and get back to you by email." };
}
