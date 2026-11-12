import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { appointments, psychologistProfiles, reviews, users, type AppointmentStatus } from "@/db/schema";

const client = alias(users, "client");
const psych = alias(users, "psych");

/** Appointment rows joined with both parties' display info. Callers always scope by user. */
function baseSelect() {
  return {
    id: appointments.id,
    startsAt: appointments.startsAt,
    endsAt: appointments.endsAt,
    status: appointments.status,
    mode: appointments.mode,
    serviceName: appointments.serviceName,
    durationMinutes: appointments.durationMinutes,
    priceMinor: appointments.priceMinor,
    currency: appointments.currency,
    clientId: appointments.clientId,
    psychologistId: appointments.psychologistId,
    clientName: client.name,
    clientAvatar: client.avatarFileId,
    psychologistName: psych.name,
    psychologistAvatar: psych.avatarFileId,
    psychologistTitle: psychologistProfiles.title,
    lateCancellation: appointments.lateCancellation,
    createdAt: appointments.createdAt,
  };
}

export type AppointmentRow = Awaited<ReturnType<typeof listForClient>>[number];

export async function listForClient(clientId: string, scope: "upcoming" | "past" | "all", limit = 50) {
  const db = await getDb();
  const now = new Date();
  const where =
    scope === "upcoming"
      ? and(eq(appointments.clientId, clientId), gte(appointments.endsAt, now), inArray(appointments.status, ["pending", "confirmed"]))
      : scope === "past"
        ? and(eq(appointments.clientId, clientId), or(lt(appointments.endsAt, now), inArray(appointments.status, ["declined", "cancelled", "completed", "no_show"])))
        : eq(appointments.clientId, clientId);
  return db
    .select(baseSelect())
    .from(appointments)
    .innerJoin(client, eq(client.id, appointments.clientId))
    .innerJoin(psych, eq(psych.id, appointments.psychologistId))
    .innerJoin(psychologistProfiles, eq(psychologistProfiles.userId, appointments.psychologistId))
    .where(where)
    .orderBy(scope === "upcoming" ? asc(appointments.startsAt) : desc(appointments.startsAt))
    .limit(limit);
}

export async function listForPsychologist(
  psychologistId: string,
  opts: { from?: Date; to?: Date; statuses?: AppointmentStatus[]; order?: "asc" | "desc"; limit?: number } = {},
) {
  const db = await getDb();
  return db
    .select(baseSelect())
    .from(appointments)
    .innerJoin(client, eq(client.id, appointments.clientId))
    .innerJoin(psych, eq(psych.id, appointments.psychologistId))
    .innerJoin(psychologistProfiles, eq(psychologistProfiles.userId, appointments.psychologistId))
    .where(
      and(
        eq(appointments.psychologistId, psychologistId),
        opts.from ? gte(appointments.endsAt, opts.from) : undefined,
        opts.to ? lt(appointments.startsAt, opts.to) : undefined,
        opts.statuses?.length ? inArray(appointments.status, opts.statuses) : undefined,
      ),
    )
    .orderBy(opts.order === "desc" ? desc(appointments.startsAt) : asc(appointments.startsAt))
    .limit(opts.limit ?? 200);
}

/** One appointment for a participant (client or psychologist) with everything the detail page needs. */
export async function getAppointmentFor(appointmentId: string, userId: string, as: "client" | "psychologist") {
  if (!/^[0-9a-f-]{36}$/i.test(appointmentId)) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      ...baseSelect(),
      clientNote: appointments.clientNote,
      meetingDetails: appointments.meetingDetails,
      cancelReason: appointments.cancelReason,
      cancelledById: appointments.cancelledById,
      cancelledAt: appointments.cancelledAt,
      rescheduleCount: appointments.rescheduleCount,
      serviceId: appointments.serviceId,
      clientTimezone: appointments.clientTimezone,
      clientEmail: client.email,
      clientPhone: client.phone,
      psychologistLocation: psychologistProfiles.location,
    })
    .from(appointments)
    .innerJoin(client, eq(client.id, appointments.clientId))
    .innerJoin(psych, eq(psych.id, appointments.psychologistId))
    .innerJoin(psychologistProfiles, eq(psychologistProfiles.userId, appointments.psychologistId))
    .where(and(eq(appointments.id, appointmentId), as === "client" ? eq(appointments.clientId, userId) : eq(appointments.psychologistId, userId)))
    .limit(1);
  if (!row) return null;
  const [review] = await db.select().from(reviews).where(eq(reviews.appointmentId, row.id)).limit(1);
  return { ...row, review: review ?? null };
}
