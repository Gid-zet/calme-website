import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import {
  activityLogs,
  appointments,
  psychologistProfiles,
  supportReports,
  users,
  verificationRequests,
  type AppointmentStatus,
} from "@/db/schema";

/* Admin read models. Every caller must have passed requireRole("admin"). Client notes and meeting details are never selected here. */

export async function platformKpis() {
  const db = await getDb();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86400_000);
  const [roles, psych, appts, upcoming, activeClients, newUsers, openReports] = await Promise.all([
    db.select({ role: users.role, n: count() }).from(users).groupBy(users.role),
    db.select({ s: psychologistProfiles.verificationStatus, n: count() }).from(psychologistProfiles).groupBy(psychologistProfiles.verificationStatus),
    db.select({ s: appointments.status, n: count(), value: sql<string>`COALESCE(SUM(${appointments.priceMinor}) FILTER (WHERE ${appointments.status} = 'completed'), 0)` }).from(appointments).groupBy(appointments.status),
    db.select({ n: count() }).from(appointments).where(and(inArray(appointments.status, ["pending", "confirmed"]), gte(appointments.startsAt, now))),
    db.select({ n: sql<number>`COUNT(DISTINCT ${appointments.clientId})::int` }).from(appointments).where(gte(appointments.createdAt, new Date(now.getTime() - 90 * 86400_000))),
    db.select({ n: count() }).from(users).where(gte(users.createdAt, d30)),
    db.select({ n: count() }).from(supportReports).where(inArray(supportReports.status, ["open", "in_progress"])),
  ]);
  const byRole = Object.fromEntries(roles.map((r) => [r.role, r.n])) as Record<string, number>;
  const byV = Object.fromEntries(psych.map((r) => [r.s, r.n])) as Record<string, number>;
  const byS = Object.fromEntries(appts.map((r) => [r.s, r.n])) as Record<string, number>;
  const totalAppts = appts.reduce((a, r) => a + r.n, 0);
  return {
    users: (byRole.client ?? 0) + (byRole.psychologist ?? 0) + (byRole.admin ?? 0),
    clients: byRole.client ?? 0,
    psychologists: byRole.psychologist ?? 0,
    verified: byV.approved ?? 0,
    pendingApplications: (byV.pending ?? 0) + (byV.needs_info ?? 0),
    activeClients90d: activeClients[0].n,
    newUsers30d: newUsers[0].n,
    appointments: totalAppts,
    upcoming: upcoming[0].n,
    completed: byS.completed ?? 0,
    cancelled: (byS.cancelled ?? 0) + (byS.declined ?? 0),
    noShow: byS.no_show ?? 0,
    sessionValueMinor: appts.reduce((a, r) => a + Number(r.value), 0),
    openReports: openReports[0].n,
  };
}

/** Weekly series for the last `weeks` weeks (Monday-start, UTC). */
export async function weeklyTrends(weeks = 12) {
  const db = await getDb();
  const since = sql`date_trunc('week', now()) - make_interval(weeks => ${weeks - 1})`;
  const [bookings, signups] = await Promise.all([
    db.execute<{ week: string; total: number; cancelled: number }>(sql`
      SELECT to_char(w, 'YYYY-MM-DD') AS week,
             COUNT(a.id)::int AS total,
             (COUNT(a.id) FILTER (WHERE a.status IN ('cancelled','declined')))::int AS cancelled
      FROM generate_series(${since}, date_trunc('week', now()), interval '1 week') w
      LEFT JOIN ${appointments} a ON date_trunc('week', a.created_at) = w
      GROUP BY w ORDER BY w`),
    db.execute<{ week: string; clients: number; psychologists: number }>(sql`
      SELECT to_char(w, 'YYYY-MM-DD') AS week,
             (COUNT(u.id) FILTER (WHERE u.role = 'client'))::int AS clients,
             (COUNT(u.id) FILTER (WHERE u.role = 'psychologist'))::int AS psychologists
      FROM generate_series(${since}, date_trunc('week', now()), interval '1 week') w
      LEFT JOIN ${users} u ON date_trunc('week', u.created_at) = w
      GROUP BY w ORDER BY w`),
  ]);
  const rows = <T,>(r: unknown) => ((r as { rows?: T[] }).rows ?? (r as T[]));
  return { bookings: rows<{ week: string; total: number; cancelled: number }>(bookings), signups: rows<{ week: string; clients: number; psychologists: number }>(signups) };
}

export async function listUsers(f: { q?: string; role?: string; status?: string; page: number; pageSize?: number }) {
  const db = await getDb();
  const size = f.pageSize ?? 25;
  const conds: SQL[] = [];
  if (f.q) {
    const q = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(users.name, q), ilike(users.email, q))!);
  }
  if (f.role === "client" || f.role === "psychologist" || f.role === "admin") conds.push(eq(users.role, f.role));
  if (f.status === "active" || f.status === "suspended" || f.status === "deactivated") conds.push(eq(users.status, f.status));
  if (f.status === "unverified") conds.push(isNull(users.emailVerifiedAt));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        avatarFileId: users.avatarFileId,
        verification: psychologistProfiles.verificationStatus,
      })
      .from(users)
      .leftJoin(psychologistProfiles, eq(psychologistProfiles.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(size)
      .offset((f.page - 1) * size),
    db.select({ n: count() }).from(users).where(where),
  ]);
  return { rows, total: total[0].n, pageCount: Math.max(1, Math.ceil(total[0].n / size)) };
}

export async function verificationQueue(limit = 50) {
  const db = await getDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      title: psychologistProfiles.title,
      licenseNumber: psychologistProfiles.licenseNumber,
      licenseCategory: psychologistProfiles.licenseCategory,
      status: psychologistProfiles.verificationStatus,
      submittedAt: sql<Date>`(SELECT MAX(${verificationRequests.createdAt}) FROM ${verificationRequests} WHERE ${verificationRequests.psychologistId} = ${users.id})`,
    })
    .from(psychologistProfiles)
    .innerJoin(users, eq(users.id, psychologistProfiles.userId))
    .where(inArray(psychologistProfiles.verificationStatus, ["pending", "needs_info"]))
    .orderBy(sql`5`)
    .limit(limit);
}

const client = alias(users, "client");
const psych = alias(users, "psych");

export async function listAppointments(f: { psychologistId?: string; client?: string; status?: AppointmentStatus; from?: Date; to?: Date; page: number }) {
  const db = await getDb();
  const size = 30;
  const conds: SQL[] = [];
  if (f.psychologistId) conds.push(eq(appointments.psychologistId, f.psychologistId));
  if (f.client) {
    const q = `%${f.client.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(client.name, q), ilike(client.email, q))!);
  }
  if (f.status) conds.push(eq(appointments.status, f.status));
  if (f.from) conds.push(gte(appointments.startsAt, f.from));
  if (f.to) conds.push(lt(appointments.startsAt, f.to));
  const where = conds.length ? and(...conds) : undefined;
  const base = db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      status: appointments.status,
      mode: appointments.mode,
      serviceName: appointments.serviceName,
      priceMinor: appointments.priceMinor,
      lateCancellation: appointments.lateCancellation,
      createdAt: appointments.createdAt,
      clientName: client.name,
      psychologistId: appointments.psychologistId,
      psychologistName: psych.name,
    })
    .from(appointments)
    .innerJoin(client, eq(client.id, appointments.clientId))
    .innerJoin(psych, eq(psych.id, appointments.psychologistId));
  const [rows, total] = await Promise.all([
    base.where(where).orderBy(desc(appointments.startsAt)).limit(size).offset((f.page - 1) * size),
    db.select({ n: count() }).from(appointments).innerJoin(client, eq(client.id, appointments.clientId)).where(where),
  ]);
  return { rows, total: total[0].n, pageCount: Math.max(1, Math.ceil(total[0].n / size)) };
}

export async function psychologistOptions() {
  const db = await getDb();
  return db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "psychologist")).orderBy(users.name);
}

export async function recentActivity(f: { action?: string; actorId?: string; page?: number; limit?: number } = {}) {
  const db = await getDb();
  const size = f.limit ?? 50;
  const conds: SQL[] = [];
  if (f.action) conds.push(ilike(activityLogs.action, `${f.action.replace(/[%_\\]/g, "\\$&")}%`));
  if (f.actorId) conds.push(eq(activityLogs.actorId, f.actorId));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, total] = await Promise.all([
    db
      .select({ log: activityLogs, actorName: users.name, actorRole: users.role })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.actorId))
      .where(where)
      .orderBy(desc(activityLogs.createdAt))
      .limit(size)
      .offset(((f.page ?? 1) - 1) * size),
    db.select({ n: count() }).from(activityLogs).where(where),
  ]);
  return { rows, total: total[0].n, pageCount: Math.max(1, Math.ceil(total[0].n / size)) };
}

/** Initials only, for list views: admins see full client names only on a detail page, which is audit-logged. */
export function maskName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i === 0 ? `${p[0]}${"•".repeat(Math.min(4, p.length - 1))}` : `${p[0]}.`))
    .join(" ");
}

export const ACTION_LABEL: Record<string, string> = {
  "auth.signup": "Signed up",
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.login_failed": "Failed sign-in",
  "auth.login_throttled": "Sign-in throttled",
  "auth.email_verified": "Verified email",
  "auth.password_reset_requested": "Requested password reset",
  "auth.password_reset": "Reset password",
  "auth.password_changed": "Changed password",
  "appointment.booked": "Booked an appointment",
  "appointment.confirmed": "Confirmed an appointment",
  "appointment.declined": "Declined a request",
  "appointment.cancelled": "Cancelled an appointment",
  "appointment.rescheduled": "Rescheduled an appointment",
  "appointment.completed": "Completed a session",
  "appointment.no_show": "Recorded a no-show",
  "availability.weekly_updated": "Updated weekly hours",
  "verification.resubmitted": "Resubmitted verification",
  "verification.approved": "Approved a psychologist",
  "verification.needs_info": "Requested more information",
  "verification.rejected": "Rejected an application",
  "admin.user_status": "Changed account status",
  "admin.invite_sent": "Invited an administrator",
  "admin.invite_accepted": "Activated admin account",
  "admin.bootstrap_invite": "Admin created from CLI",
  "admin.viewed_document": "Viewed a credential document",
  "admin.viewed_appointment": "Viewed appointment details",
  "admin.settings_updated": "Updated platform settings",
  "admin.specialization": "Updated specialisations",
  "admin.service_status": "Changed a service's visibility",
  "admin.review_visibility": "Moderated a review",
  "admin.email_verified": "Manually verified an email",
  "support.report_created": "Reported an issue",
  "support.report_updated": "Updated a support report",
};
