import type { Metadata } from "next";
import Link from "next/link";
import { OutcomeBar, SignupLines, WeeklyBars } from "@/components/admin/Charts";
import { PageHeader, Section, StatCard, VerificationBadge } from "@/components/app/ui";
import { formatMoney, relativeTime } from "@/lib/format";
import { ACTION_LABEL, platformKpis, recentActivity, verificationQueue, weeklyTrends } from "@/lib/server/admin";
import { requireRole } from "@/lib/server/auth";
import { releaseStaleRequests } from "@/lib/server/booking";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminHome() {
  await requireRole("admin", "/admin");
  await releaseStaleRequests();
  const [k, trends, queue, activity] = await Promise.all([platformKpis(), weeklyTrends(12), verificationQueue(6), recentActivity({ limit: 12 })]);
  const cancelRate = k.appointments ? Math.round((k.cancelled / k.appointments) * 100) : 0;

  return (
    <>
      <PageHeader title="Platform overview" description="Live figures from the CalMe database." />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Registered users" value={k.users} hint={`+${k.newUsers30d} in 30 days`} href="/admin/users" />
        <StatCard label="Clients" value={k.clients} hint={`${k.activeClients90d} booked in 90 days`} href="/admin/users?role=client" />
        <StatCard label="Psychologists" value={k.psychologists} hint={`${k.verified} verified`} href="/admin/psychologists?tab=verified" />
        <StatCard label="Applications" value={k.pendingApplications} hint="awaiting review" tone={k.pendingApplications ? "var(--sun-soft)" : "#fff"} href="/admin/psychologists" />
        <StatCard label="Upcoming sessions" value={k.upcoming} hint="pending + confirmed" href="/admin/appointments?scope=upcoming" />
        <StatCard label="Open reports" value={k.openReports} tone={k.openReports ? "var(--coral-soft)" : "#fff"} href="/admin/reports" />
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <div className="panel p-5">
          <WeeklyBars title="Bookings made per week" valueLabel="bookings" data={trends.bookings.map((b) => ({ week: b.week, value: b.total, secondary: b.cancelled }))} />
        </div>
        <div className="panel p-5">
          <SignupLines data={trends.signups} />
        </div>
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <b className="text-sm">Appointment outcomes (all time · {k.appointments} total)</b>
          <div className="mt-3">
            <OutcomeBar
              parts={[
                { label: "Completed", value: k.completed, color: "#1f6fe5" },
                { label: "Upcoming", value: k.upcoming, color: "#5fd3a6" },
                { label: "Cancelled/declined", value: k.cancelled, color: "#a8a49b" },
                { label: "No-show", value: k.noShow, color: "#c2410c" },
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-ink-2">Cancellation rate {cancelRate}%.</p>
        </div>
        <StatCard label="Completed session value" value={formatMoney(k.sessionValueMinor)} hint="Fees on completed sessions. Paid directly to psychologists; CalMe doesn't process payments." />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section title="Verification queue" action={<Link href="/admin/psychologists" className="text-sm font-bold underline">Open queue</Link>}>
          {queue.length ? (
            <ul className="panel divide-y divide-ink/10">
              {queue.map((q) => (
                <li key={q.id}>
                  <Link href={`/admin/psychologists/${q.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#fffdf8]">
                    <span>
                      <b className="block">{q.name}</b>
                      <span className="text-xs text-ink-2">
                        {q.licenseCategory} · {q.licenseNumber} · submitted {relativeTime(q.submittedAt ?? q.createdAt)}
                      </span>
                    </span>
                    <VerificationBadge status={q.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel px-4 py-6 text-center text-sm text-ink-2">No applications waiting. 🎉</p>
          )}
        </Section>
        <Section title="Recent activity" action={<Link href="/admin/activity" className="text-sm font-bold underline">Full log</Link>}>
          <ul className="panel divide-y divide-ink/10 text-sm">
            {activity.rows.map(({ log, actorName, actorRole }) => (
              <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 truncate">
                  <b>{actorName ?? "System"}</b> {actorRole && <span className="text-xs text-ink-2">({actorRole})</span>} · {ACTION_LABEL[log.action] ?? log.action}
                </span>
                <span className="shrink-0 text-xs text-ink-2">{relativeTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
