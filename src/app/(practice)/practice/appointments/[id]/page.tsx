import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, StatusBadge } from "@/components/app/ui";
import { AppointmentControls } from "@/components/practice/AppointmentControls";
import { formatDateTime, formatMoney, formatTime, MODE_LABEL, relativeTime } from "@/lib/format";
import { getAppointmentFor } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Appointment" };

export default async function PracticeAppointment({ params }: PageProps<"/practice/appointments/[id]">) {
  const { id } = await params;
  const me = await requireRole("psychologist", `/practice/appointments/${id}`);
  const a = await getAppointmentFor(id, me.id, "psychologist");
  if (!a) notFound();
  const tz = me.timezone;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/practice/appointments" className="text-sm font-semibold underline">
        ← Appointments
      </Link>
      <div className="panel-pop mt-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink bg-mint-soft p-5">
          <div>
            <StatusBadge status={a.status} />
            <h1 className="mt-2 text-[clamp(1.5rem,3.5vw,2.1rem)]">{formatDateTime(a.startsAt, tz, { weekday: "long", month: "long" })}</h1>
            <p className="text-sm text-ink-2">
              Until {formatTime(a.endsAt, tz)} ({tz.replace(/_/g, " ")}) · client&apos;s time zone: {a.clientTimezone.replace(/_/g, " ")}
            </p>
          </div>
          <span className="text-xs font-semibold">Booked {relativeTime(a.createdAt)}</span>
        </div>
        <div className="grid gap-5 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={a.clientName} fileId={a.clientAvatar} size={52} />
            <div>
              <b className="block font-display text-lg">{a.clientName}</b>
              <span className="text-sm text-ink-2">
                {a.clientEmail}
                {a.clientPhone ? ` · ${a.clientPhone}` : ""}
              </span>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ["Service", `${a.serviceName} · ${a.durationMinutes} min`],
              ["Format", MODE_LABEL[a.mode]],
              ["Fee", formatMoney(a.priceMinor, a.currency)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border-2 border-ink bg-cream px-3 py-2">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-ink-2">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <b className="text-sm">Note from the client</b>
            <p className="mt-1 whitespace-pre-line rounded-xl bg-cream px-4 py-3 text-sm">{a.clientNote ?? <span className="text-ink-2">No note was added.</span>}</p>
            <p className="mt-1 text-xs text-ink-2">Private to you and the client. CalMe administrators can&apos;t see it. Keep clinical records in your own records system.</p>
          </div>
          {(a.status === "cancelled" || a.status === "declined") && (
            <p className="rounded-xl bg-[#f2f2f2] px-4 py-3 text-sm">
              {a.status === "declined" ? "Declined" : "Cancelled"} {a.cancelledById === me.id ? "by you" : a.cancelledById ? "by the client" : "automatically"}
              {a.cancelReason ? `: ${a.cancelReason}` : "."} {a.lateCancellation && <b>Late cancellation.</b>}
            </p>
          )}
          {a.review && (
            <p className="text-sm">
              Client review: <span className="text-[#e3a008]">{"★".repeat(a.review.rating)}</span> {a.review.comment}
            </p>
          )}
          <AppointmentControls id={a.id} status={a.status} started={a.startsAt <= new Date()} serviceId={a.serviceId} timeZone={tz} mode={a.mode} meetingDetails={a.meetingDetails} />
        </div>
      </div>
    </div>
  );
}
