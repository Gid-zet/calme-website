import type { Metadata } from "next";
import Link from "next/link";
import { AppointmentItem } from "@/components/app/AppointmentItem";
import { Avatar, EmptyState, Flash, Section, StatusBadge } from "@/components/app/ui";
import { ResendVerificationButton } from "@/components/auth/PasswordForms";
import { PsychologistCard } from "@/components/directory/PsychologistCard";
import { formatDateTime, MODE_LABEL, relativeTime } from "@/lib/format";
import { listForClient } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";
import { releaseStaleRequests } from "@/lib/server/booking";
import { recentlyViewed, recommendedFor } from "@/lib/server/directory";
import { listNotifications } from "@/lib/server/notifications";
import { zonedParts } from "@/lib/scheduling/time";

export const metadata: Metadata = { title: "Your dashboard" };

function greeting(tz: string) {
  const h = zonedParts(new Date(), tz).hour;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function ClientHome({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireRole("client", "/dashboard");
  const sp = await searchParams;
  await releaseStaleRequests();
  const [upcoming, past, notes, recommended, recent] = await Promise.all([
    listForClient(user.id, "upcoming", 10),
    listForClient(user.id, "past", 4),
    listNotifications(user.id, 5),
    recommendedFor(user.id, 3),
    recentlyViewed(user.id, 3),
  ]);
  const [next, ...later] = upcoming;
  const tz = user.timezone;
  const lastPsych = past.find((p) => p.status === "completed");

  return (
    <div className="grid gap-10">
      <Flash message={sp.welcome ? "Welcome to CalMe! Your account is ready." : sp.verified ? "Thanks, your email is confirmed." : null} />
      {!user.emailVerified && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-sun-soft px-5 py-4">
          <p className="font-semibold">Please confirm your email ({user.email}) so you can book sessions and receive reminders.</p>
          <ResendVerificationButton />
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="hand text-2xl text-blue">{greeting(tz).toLowerCase()} ✿</span>
          <h1 className="text-[clamp(2rem,4.5vw,3rem)]">{user.name.split(" ")[0]}, how are you feeling today?</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/psychologists" className="btn btn-primary">
            Find a psychologist
          </Link>
          {lastPsych && (
            <Link href={`/psychologists/${lastPsych.psychologistId}/book`} className="btn btn-white">
              Book again with {lastPsych.psychologistName.split(" ").slice(0, 2).join(" ")}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-8">
          <Section title="Your next session">
            {next ? (
              <Link href={`/dashboard/appointments/${next.id}`} className="block rounded-[26px] border-[2.5px] border-ink bg-blue p-6 text-white shadow-[6px_6px_0_var(--line)] transition-transform hover:-translate-y-0.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-bold">{relativeTime(next.startsAt)}</span>
                  <StatusBadge status={next.status} />
                </div>
                <p className="mt-4 font-display text-[1.9rem] font-bold leading-tight">{formatDateTime(next.startsAt, tz, { weekday: "long", month: "long" })}</p>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar name={next.psychologistName} fileId={next.psychologistAvatar} size={44} />
                  <div>
                    <b className="block">{next.psychologistName}</b>
                    <span className="text-sm text-white/80">
                      {next.serviceName} · {next.durationMinutes} min · {MODE_LABEL[next.mode]}
                    </span>
                  </div>
                </div>
                {next.status === "pending" && <p className="mt-4 text-sm text-white/85">Waiting for {next.psychologistName.split(" ")[0]} to confirm. We&apos;ll let you know.</p>}
              </Link>
            ) : (
              <EmptyState icon="🗓️" title="No upcoming sessions" body="When you book a session it'll show up here, with reminders before it starts." action={<Link href="/psychologists" className="btn btn-primary btn-sm">Find a psychologist</Link>} />
            )}
          </Section>

          {later.length > 0 && (
            <Section title="Also coming up" action={<Link href="/dashboard/appointments" className="text-sm font-bold underline">All appointments</Link>}>
              <ul className="grid gap-2">
                {later.map((a) => (
                  <AppointmentItem key={a.id} a={a} tz={tz} perspective="client" />
                ))}
              </ul>
            </Section>
          )}

          <Section title="Previous sessions" action={past.length ? <Link href="/dashboard/appointments?tab=past" className="text-sm font-bold underline">History</Link> : undefined}>
            {past.length ? (
              <ul className="grid gap-2">
                {past.map((a) => (
                  <AppointmentItem key={a.id} a={a} tz={tz} perspective="client" />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Your past sessions will be listed here.</p>
            )}
          </Section>
        </div>

        <div className="grid content-start gap-8">
          <Section title="Updates" action={<Link href="/dashboard/notifications" className="text-sm font-bold underline">See all</Link>}>
            {notes.length ? (
              <ul className="panel divide-y divide-ink/10">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <Link href={n.link ?? "/dashboard/notifications"} className="block">
                      <span className="flex items-center gap-2">
                        {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="Unread" />}
                        <b className="text-sm">{n.title}</b>
                      </span>
                      <span className="block text-xs text-ink-2">{relativeTime(n.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">You&apos;re all caught up.</p>
            )}
          </Section>
          <div className="rounded-[22px] border-2 border-ink bg-coral-soft p-5">
            <b className="font-display text-lg">Need help right now?</b>
            <p className="mt-1 text-sm text-ink-2">If you&apos;re in crisis or thinking about harming yourself, please don&apos;t wait for an appointment.</p>
            <Link href="/resources#crisis" className="btn btn-white btn-sm mt-3">
              Crisis contacts
            </Link>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <Section title="Recently viewed">
          <div className="grid gap-4">
            {recent.map((p) => (
              <PsychologistCard key={p.id} p={p} viewerTz={tz} compact />
            ))}
          </div>
        </Section>
      )}

      <Section title="Recommended for you" action={<Link href="/psychologists" className="text-sm font-bold underline">Browse all</Link>}>
        {recommended.length ? (
          <div className="grid gap-4">
            {recommended.map((p) => (
              <PsychologistCard key={p.id} p={p} viewerTz={tz} compact />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-2">We&apos;re onboarding psychologists. Check back soon.</p>
        )}
      </Section>
    </div>
  );
}
