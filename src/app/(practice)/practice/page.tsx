import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EmptyState, Flash, PageHeader, Section, StatCard, StatusBadge } from "@/components/app/ui";
import { RequestButtons } from "@/components/practice/AppointmentControls";
import { formatDate, formatDateTime, formatMoney, formatTime, MODE_LABEL, relativeTime, VERIFICATION_META } from "@/lib/format";
import { listForPsychologist } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";
import { releaseStaleRequests } from "@/lib/server/booking";
import { listNotifications } from "@/lib/server/notifications";
import { bookingsOnBlockedDays, getPractice, practiceStats } from "@/lib/server/practice";
import { localDateOf } from "@/lib/scheduling/time";

export const metadata: Metadata = { title: "Practice overview" };

export default async function PracticeHome({ searchParams }: PageProps<"/practice">) {
  const me = await requireRole("psychologist", "/practice");
  const sp = await searchParams;
  await releaseStaleRequests();
  const now = new Date();
  const [practice, stats, requests, upcoming, notes] = await Promise.all([
    getPractice(me.id),
    practiceStats(me.id),
    listForPsychologist(me.id, { statuses: ["pending"], limit: 10 }),
    listForPsychologist(me.id, { from: now, to: new Date(now.getTime() + 7 * 86400_000), statuses: ["confirmed"], limit: 30 }),
    listNotifications(me.id, 6),
  ]);
  const conflicts = await bookingsOnBlockedDays(me.id, practice.timezone);
  const tz = me.timezone;
  const today = localDateOf(now, tz);
  const todays = upcoming.filter((a) => localDateOf(a.startsAt, tz) === today);
  const done = practice.checklist.filter((c) => c.done).length;

  return (
    <>
      <Flash message={sp.welcome ? "Application received! Set up your services and hours while our team verifies your registration." : sp.verified ? "Thanks, your email is confirmed." : null} />
      <PageHeader
        eyebrow={formatDate(now, tz, { year: undefined, weekday: "long", month: "long" })}
        title={`Welcome back, ${me.name.split(" ").slice(0, 2).join(" ")}`}
        description={todays.length ? `You have ${todays.length} session${todays.length > 1 ? "s" : ""} today.` : "No sessions today."}
        actions={
          <>
            <Link href="/practice/schedule" className="btn btn-white btn-sm">
              Open calendar
            </Link>
            <Link href={`/psychologists/${me.id}`} className="btn btn-white btn-sm">
              View public profile
            </Link>
          </>
        }
      />

      {done < practice.checklist.length && (
        <div className="panel-pop mb-8 p-5" style={{ background: "var(--mint-soft)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="font-display text-lg">Get your practice live on CalMe</b>
            <span className="text-sm font-semibold">
              {done}/{practice.checklist.length} done
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
            <div className="h-full bg-mint" style={{ width: `${(done / practice.checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {practice.checklist.map((c) => (
              <li key={c.key}>
                <Link href={c.href} className={`flex items-center gap-2 rounded-xl border-2 border-ink px-3 py-2 text-sm font-semibold ${c.done ? "bg-white/60 text-ink-2 line-through" : "bg-white hover:bg-sun-soft"}`}>
                  <span aria-hidden>{c.done ? "✓" : "○"}</span> {c.label}
                </Link>
              </li>
            ))}
          </ul>
          {practice.verificationStatus !== "approved" && (
            <p className="mt-3 text-sm">
              Verification: <b>{VERIFICATION_META[practice.verificationStatus].label}</b>. Clients can&apos;t find or book you until it&apos;s approved.
            </p>
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-ink bg-coral-soft px-5 py-4">
          <b>{conflicts.length} booked session{conflicts.length > 1 ? "s fall" : " falls"} on days you&apos;ve blocked off.</b>
          <p className="text-sm">Reschedule or cancel {conflicts.length > 1 ? "them" : "it"} so your clients know: {conflicts.map((c, i) => (
            <Link key={c.id} href={`/practice/appointments/${c.id}`} className="font-semibold underline">
              {i ? ", " : ""}
              {formatDateTime(c.startsAt, tz)}
            </Link>
          ))}</p>
        </div>
      )}

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Pending requests" value={stats.pending} tone={stats.pending ? "var(--sun-soft)" : "#fff"} href="/practice/appointments?tab=requests" />
        <StatCard label="Upcoming" value={stats.upcoming} hint="confirmed" href="/practice/appointments" />
        <StatCard label="Completed" value={stats.completed} hint={stats.noShow ? `${stats.noShow} no-show${stats.noShow > 1 ? "s" : ""}` : "sessions"} />
        <StatCard label="Clients" value={stats.clients} hint="seen or booked" />
        <StatCard label="Session fees" value={formatMoney(stats.feesMonthMinor)} hint={`this month · ${formatMoney(stats.feesTotalMinor)} all time`} />
        <StatCard label="Rating" value={stats.rating ? `${stats.rating.toFixed(1)}★` : "–"} hint={`${stats.reviewCount} review${stats.reviewCount === 1 ? "" : "s"}`} />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-8">
          <Section title="Booking requests" action={<Link href="/practice/appointments?tab=requests" className="text-sm font-bold underline">All requests</Link>}>
            {requests.length ? (
              <ul className="grid gap-3">
                {requests.map((a) => (
                  <li key={a.id} className="panel grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <Link href={`/practice/appointments/${a.id}`} className="flex items-center gap-3">
                      <Avatar name={a.clientName} fileId={a.clientAvatar} size={40} />
                      <div>
                        <b className="block">{a.clientName}</b>
                        <span className="text-sm text-ink-2">
                          {formatDateTime(a.startsAt, tz)} · {a.serviceName} · {MODE_LABEL[a.mode]}
                        </span>
                        <span className="block text-xs text-ink-2">Requested {relativeTime(a.createdAt)}</span>
                      </div>
                    </Link>
                    <RequestButtons id={a.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="📭" title="No pending requests" body={practice.autoConfirm ? "Bookings are confirmed automatically. You can change this in Availability." : "New booking requests will appear here for you to accept or decline."} />
            )}
          </Section>

          <Section title="Next 7 days" action={<Link href="/practice/schedule" className="text-sm font-bold underline">Calendar</Link>}>
            {upcoming.length ? (
              <ol className="panel divide-y divide-ink/10">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <Link href={`/practice/appointments/${a.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-[#fffdf8]">
                      <span className="w-28 shrink-0 text-sm">
                        <b className="block">{localDateOf(a.startsAt, tz) === today ? "Today" : formatDate(a.startsAt, tz, { year: undefined, month: "short" })}</b>
                        {formatTime(a.startsAt, tz)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <b>{a.clientName}</b> <span className="text-sm text-ink-2">· {a.serviceName} · {MODE_LABEL[a.mode]}</span>
                      </span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon="🌤️" title="A clear week ahead" body={practice.listed ? "Confirmed sessions for the next 7 days will show here." : "Once you're verified and have services and hours set up, clients can book you."} />
            )}
          </Section>
        </div>

        <div className="grid content-start gap-8">
          <Section title="Notifications" action={<Link href="/practice/notifications" className="text-sm font-bold underline">All</Link>}>
            {notes.length ? (
              <ul className="panel divide-y divide-ink/10">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <Link href={n.link ?? "/practice/notifications"} className="block">
                      <span className="flex items-center gap-2">
                        {!n.readAt && <span className="h-2 w-2 rounded-full bg-coral" aria-label="Unread" />}
                        <b className="text-sm">{n.title}</b>
                      </span>
                      {n.body && <span className="line-clamp-2 block text-xs text-ink-2">{n.body}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Nothing new.</p>
            )}
          </Section>
          <Section title="Your booking rules">
            <dl className="panel grid grid-cols-2 gap-3 p-4 text-sm">
              <div>
                <dt className="text-ink-2">Break between sessions</dt>
                <dd className="font-bold">{practice.bufferMinutes} min</dd>
              </div>
              <div>
                <dt className="text-ink-2">Minimum notice</dt>
                <dd className="font-bold">{practice.minNoticeHours} h</dd>
              </div>
              <div>
                <dt className="text-ink-2">Booking horizon</dt>
                <dd className="font-bold">{practice.maxAdvanceDays} days</dd>
              </div>
              <div>
                <dt className="text-ink-2">Confirmation</dt>
                <dd className="font-bold">{practice.autoConfirm ? "Automatic" : "Manual"}</dd>
              </div>
              <Link href="/practice/availability" className="col-span-2 font-semibold underline">
                Edit availability &amp; rules
              </Link>
            </dl>
          </Section>
        </div>
      </div>
    </>
  );
}
