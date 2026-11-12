import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Flash, StatusBadge } from "@/components/app/ui";
import { ClientAppointmentActions } from "@/components/booking/ClientAppointmentActions";
import { formatDateTime, formatMoney, formatTime, MODE_LABEL, STATUS_META } from "@/lib/format";
import { getAppointmentFor } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";
import { clientChangeRules, getSettings, policyText } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Appointment" };

export default async function ClientAppointmentPage({ params, searchParams }: PageProps<"/dashboard/appointments/[id]">) {
  const { id } = await params;
  const user = await requireRole("client", `/dashboard/appointments/${id}`);
  const [a, sp, settings] = await Promise.all([getAppointmentFor(id, user.id, "client"), searchParams, getSettings()]);
  if (!a) notFound();
  const tz = user.timezone;
  const { active, inWindow, rescheduleBlockedReason } = clientChangeRules(a, settings);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/appointments" className="text-sm font-semibold underline">
        ← My appointments
      </Link>
      <div className="mt-4">
        <Flash
          message={
            sp.booked
              ? a.status === "confirmed"
                ? "You're booked in! We've emailed you the details."
                : "Request sent! We'll let you know as soon as your psychologist confirms."
              : null
          }
        />
      </div>

      <div className="card-pop overflow-hidden">
        <div className="border-b-2 border-ink p-6" style={{ background: STATUS_META[a.status].bg }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={a.status} />
            <span className="text-sm font-semibold">Ref. {a.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <h1 className="mt-3 text-[clamp(1.7rem,4vw,2.4rem)]">{formatDateTime(a.startsAt, tz, { weekday: "long", month: "long" })}</h1>
          <p className="text-ink-2">
            Until {formatTime(a.endsAt, tz)} · {tz.replace(/_/g, " ")}
          </p>
        </div>
        <div className="grid gap-6 p-6">
          <div className="flex items-center gap-4">
            <Avatar name={a.psychologistName} fileId={a.psychologistAvatar} size={56} />
            <div className="flex-1">
              <b className="block font-display text-lg">{a.psychologistName}</b>
              <span className="text-sm text-ink-2">{a.psychologistTitle}</span>
            </div>
            <Link href={`/psychologists/${a.psychologistId}`} className="btn btn-white btn-sm">
              Profile
            </Link>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ["Session", `${a.serviceName} · ${a.durationMinutes} min`],
              ["How", MODE_LABEL[a.mode]],
              ["Fee", `${formatMoney(a.priceMinor, a.currency)} (paid to your psychologist)`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border-2 border-ink bg-cream px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[.1em] text-ink-2">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          {a.status === "confirmed" && (
            <div className="rounded-2xl border-2 border-ink bg-mint-soft px-4 py-3">
              <b className="block text-sm">{a.mode === "online" ? "How to join" : "Where to go"}</b>
              <p className="whitespace-pre-line text-sm">
                {a.meetingDetails ?? (a.mode === "online" ? "Your psychologist will add the video link here before the session." : (a.psychologistLocation ?? "Your psychologist will share the address."))}
              </p>
            </div>
          )}
          {a.status === "pending" && <p className="rounded-2xl border-2 border-ink bg-sun-soft px-4 py-3 text-sm">Your request is waiting for {a.psychologistName}&apos;s confirmation. The time is held for you in the meantime.</p>}
          {(a.status === "cancelled" || a.status === "declined") && (
            <p className="rounded-2xl border-2 border-ink bg-[#f2f2f2] px-4 py-3 text-sm">
              {a.status === "declined" ? "Declined" : "Cancelled"}
              {a.cancelledById === user.id ? " by you" : a.cancelledById ? ` by ${a.psychologistName}` : ""}
              {a.cancelReason ? `: ${a.cancelReason}` : "."}
              {a.lateCancellation && " (late cancellation)"}
            </p>
          )}
          {a.clientNote && (
            <div>
              <b className="text-sm">Your note to {a.psychologistName.split(" ")[0]}</b>
              <p className="mt-1 whitespace-pre-line rounded-2xl bg-cream px-4 py-3 text-sm text-ink-2">{a.clientNote}</p>
            </div>
          )}
          {a.review && (
            <p className="text-sm">
              You rated this session <span className="text-[#e3a008]">{"★".repeat(a.review.rating)}</span>
              {a.review.comment ? `: "${a.review.comment}"` : "."}
            </p>
          )}

          <ClientAppointmentActions
            appointmentId={a.id}
            serviceId={a.serviceId}
            timeZone={tz}
            canChange={active}
            canReschedule={active && !rescheduleBlockedReason}
            rescheduleBlockedReason={rescheduleBlockedReason}
            lateCancel={a.status === "confirmed" && inWindow}
            canReview={a.status === "completed" && !a.review}
            policy={policyText(settings)}
          />
        </div>
      </div>
    </div>
  );
}
