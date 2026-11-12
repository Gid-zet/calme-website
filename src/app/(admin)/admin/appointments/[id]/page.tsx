import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportControl } from "@/components/admin/AdminControls";
import { StatusBadge } from "@/components/app/ui";
import { getDb } from "@/db";
import { activityLogs, appointments, supportReports, users } from "@/db/schema";
import { formatDateTime, formatMoney, MODE_LABEL } from "@/lib/format";
import { ACTION_LABEL } from "@/lib/server/admin";
import { logActivity } from "@/lib/server/audit";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Appointment" };

const client = alias(users, "client");
const psych = alias(users, "psych");

export default async function AdminAppointment({ params }: PageProps<"/admin/appointments/[id]">) {
  const { id } = await params;
  const admin = await requireRole("admin", `/admin/appointments/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  // Deliberately excludes clientNote and meetingDetails: those are private between client and psychologist.
  const [a] = await db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      mode: appointments.mode,
      serviceName: appointments.serviceName,
      durationMinutes: appointments.durationMinutes,
      priceMinor: appointments.priceMinor,
      clientTimezone: appointments.clientTimezone,
      cancelReason: appointments.cancelReason,
      cancelledAt: appointments.cancelledAt,
      cancelledById: appointments.cancelledById,
      lateCancellation: appointments.lateCancellation,
      rescheduleCount: appointments.rescheduleCount,
      createdAt: appointments.createdAt,
      confirmedAt: appointments.confirmedAt,
      reminderSentAt: appointments.reminderSentAt,
      hasNote: appointments.clientNote,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      psychologistId: psych.id,
      psychologistName: psych.name,
    })
    .from(appointments)
    .innerJoin(client, eq(client.id, appointments.clientId))
    .innerJoin(psych, eq(psych.id, appointments.psychologistId))
    .where(eq(appointments.id, id));
  if (!a) notFound();
  await logActivity({ actorId: admin.id, action: "admin.viewed_appointment", entityType: "appointment", entityId: id });
  const [trail, reports] = await Promise.all([
    db
      .select({ log: activityLogs, actorName: users.name })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.actorId))
      .where(eq(activityLogs.entityId, id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(30),
    db.select().from(supportReports).where(eq(supportReports.appointmentId, id)).orderBy(desc(supportReports.createdAt)),
  ]);
  const tz = admin.timezone;
  const by = a.cancelledById === a.clientId ? "client" : a.cancelledById === a.psychologistId ? "psychologist" : a.cancelledById ? "administrator" : "system";

  return (
    <div className="grid max-w-4xl gap-6">
      <Link href="/admin/appointments" className="text-sm font-semibold underline">
        ← Appointments
      </Link>
      <section className="panel-pop p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={a.status} />
          <span className="font-mono text-xs">{a.id}</span>
        </div>
        <h1 className="mt-2 text-[clamp(1.5rem,3.5vw,2.1rem)]">{formatDateTime(a.startsAt, tz, { weekday: "long", month: "long" })}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {[
            ["Psychologist", <Link key="p" href={`/admin/psychologists/${a.psychologistId}`} className="underline">{a.psychologistName}</Link>],
            ["Client", <Link key="c" href={`/admin/users/${a.clientId}`} className="underline">{`${a.clientName} (${a.clientEmail})`}</Link>],
            ["Session", `${a.serviceName} · ${a.durationMinutes} min · ${MODE_LABEL[a.mode]} · ${formatMoney(a.priceMinor)}`],
            ["Client time zone", a.clientTimezone],
            ["Booked", formatDateTime(a.createdAt, tz)],
            ["Confirmed", a.confirmedAt ? formatDateTime(a.confirmedAt, tz) : "–"],
            ["Reschedules", String(a.rescheduleCount)],
            ["Reminder sent", a.reminderSentAt ? formatDateTime(a.reminderSentAt, tz) : "–"],
            ...(a.cancelledAt ? [["Cancelled", `${formatDateTime(a.cancelledAt, tz)} by ${by}${a.lateCancellation ? " (late)" : ""}${a.cancelReason ? `: ${a.cancelReason}` : ""}`]] : []),
            ["Client note", a.hasNote ? "Present (private to client and psychologist)" : "None"],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl bg-cream px-3 py-2">
              <dt className="text-xs font-bold uppercase tracking-[.08em] text-ink-2">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-2">Your view of this appointment has been recorded in the activity log.</p>
      </section>

      {reports.length > 0 && (
        <section className="panel p-5">
          <h2 className="!text-xl">Reported issues</h2>
          <ul className="mt-3 grid gap-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-cream p-3 text-sm">
                <b className="capitalize">{r.category}</b> · {formatDateTime(r.createdAt, tz)}
                <p className="my-1 whitespace-pre-line">{r.message}</p>
                <ReportControl id={r.id} status={r.status} resolution={r.resolution} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="!text-xl">Timeline</h2>
        <ol className="mt-3 grid gap-2 text-sm">
          {trail.map(({ log, actorName }) => (
            <li key={log.id} className="flex justify-between gap-3 border-l-4 border-lilac pl-3">
              <span>
                <b>{actorName ?? "System"}</b> · {ACTION_LABEL[log.action] ?? log.action}
              </span>
              <span className="text-ink-2">{formatDateTime(log.createdAt, tz)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
