import type { Metadata } from "next";
import Link from "next/link";
import { AppointmentItem } from "@/components/app/AppointmentItem";
import { EmptyState, PageHeader } from "@/components/app/ui";
import { formatTime, STATUS_META } from "@/lib/format";
import { listForPsychologist } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";
import { getPractice, overridesFor } from "@/lib/server/practice";
import { workingIntervalsFor } from "@/lib/scheduling/slots";
import { addDays, isLocalDate, localDateOf, weekdayOf, zonedParts, zonedToUtc } from "@/lib/scheduling/time";

export const metadata: Metadata = { title: "Schedule" };

const HOUR_PX = 56;

export default async function SchedulePage({ searchParams }: PageProps<"/practice/schedule">) {
  const me = await requireRole("psychologist", "/practice/schedule");
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "week";
  const practice = await getPractice(me.id);
  const tz = practice.timezone; // the calendar follows the psychologist's working time zone
  const today = localDateOf(new Date(), tz);
  const anchor = typeof sp.week === "string" && isLocalDate(sp.week) ? sp.week : today;
  const monday = addDays(anchor, -((weekdayOf(anchor) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const from = zonedToUtc(monday, 0, tz);
  const to = zonedToUtc(addDays(monday, 7), 0, tz);
  const [appts, overrides] = await Promise.all([
    listForPsychologist(me.id, { from, to, statuses: ["pending", "confirmed", "completed", "no_show"] }),
    overridesFor(me.id, monday),
  ]);
  const ov = overrides.map((o) => ({ ...o })) as Parameters<typeof workingIntervalsFor>[2];

  // Visible hour range: working hours and bookings this week, padded
  const intervals = days.map((d) => workingIntervalsFor(d, practice.rules, ov));
  const mins = [...intervals.flat().flatMap((i) => [i.start, i.end]), ...appts.flatMap((a) => [zonedParts(a.startsAt, tz).hour * 60, zonedParts(a.endsAt, tz).hour * 60 + 60])];
  const startHour = Math.max(0, Math.floor(Math.min(8 * 60, ...mins) / 60));
  const endHour = Math.min(24, Math.ceil(Math.max(18 * 60, ...mins) / 60));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const label = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(new Date(`${d}T12:00:00Z`));
  const q = (week: string) => `/practice/schedule?week=${week}&view=${view}`;

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`Week of ${label(monday, { day: "numeric", month: "long", year: "numeric" })} · ${tz.replace(/_/g, " ")}`}
        actions={
          <>
            <div className="inline-flex rounded-full border-2 border-ink bg-white p-1" role="tablist" aria-label="View">
              {(["week", "list"] as const).map((v) => (
                <Link key={v} role="tab" aria-selected={view === v} href={`/practice/schedule?week=${monday}&view=${v}`} className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${view === v ? "bg-mint" : ""}`}>
                  {v === "week" ? "Calendar" : "List"}
                </Link>
              ))}
            </div>
            <Link href={q(addDays(monday, -7))} className="btn btn-white btn-sm" aria-label="Previous week">
              ←
            </Link>
            <Link href={q(today)} className="btn btn-white btn-sm">
              Today
            </Link>
            <Link href={q(addDays(monday, 7))} className="btn btn-white btn-sm" aria-label="Next week">
              →
            </Link>
          </>
        }
      />

      {view === "list" ? (
        appts.length ? (
          <ul className="grid gap-2">
            {appts.map((a) => (
              <AppointmentItem key={a.id} a={a} tz={tz} perspective="psychologist" />
            ))}
          </ul>
        ) : (
          <EmptyState icon="🗓️" title="No sessions this week" />
        )
      ) : (
        <div className="overflow-x-auto rounded-[20px] border-2 border-ink bg-white">
          <div className="grid min-w-[860px]" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
            <div className="border-b-2 border-ink bg-cream" />
            {days.map((d) => (
              <div key={d} className={`border-b-2 border-l border-ink border-l-ink/10 px-2 py-2 text-center ${d === today ? "bg-mint-soft" : "bg-cream"}`}>
                <span className="block text-xs font-bold uppercase text-ink-2">{label(d, { weekday: "short" })}</span>
                <span className="font-display text-xl font-bold">{label(d, { day: "numeric" })}</span>
              </div>
            ))}
            <div className="relative" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h, i) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[.7rem] text-ink-2" style={{ top: i * HOUR_PX }}>
                  {i ? `${String(h).padStart(2, "0")}:00` : ""}
                </span>
              ))}
            </div>
            {days.map((d, di) => {
              const blocked = ov.some((o) => o.kind === "blocked" && o.startDate <= d && d <= o.endDate);
              return (
                <div key={d} className="relative border-l border-ink/10" style={{ height: hours.length * HOUR_PX, background: blocked ? "repeating-linear-gradient(45deg,#f6f2ea,#f6f2ea 8px,#fff 8px,#fff 16px)" : undefined }}>
                  {hours.map((h, i) => (
                    <div key={h} className="absolute inset-x-0 border-t border-ink/[.07]" style={{ top: i * HOUR_PX }} />
                  ))}
                  {intervals[di].map((iv, k) => (
                    <div key={k} aria-hidden className="absolute inset-x-0 bg-mint-soft/60" style={{ top: ((iv.start - startHour * 60) / 60) * HOUR_PX, height: ((iv.end - iv.start) / 60) * HOUR_PX }} />
                  ))}
                  {blocked && <span className="absolute inset-x-1 top-1 rounded-md bg-white/90 px-1.5 py-0.5 text-center text-[.7rem] font-bold">Time off</span>}
                  {appts
                    .filter((a) => localDateOf(a.startsAt, tz) === d)
                    .map((a) => {
                      const p = zonedParts(a.startsAt, tz);
                      const top = ((p.hour * 60 + p.minute - startHour * 60) / 60) * HOUR_PX;
                      const height = Math.max(28, (a.durationMinutes / 60) * HOUR_PX - 2);
                      return (
                        <Link
                          key={a.id}
                          href={`/practice/appointments/${a.id}`}
                          className="absolute inset-x-1 overflow-hidden rounded-lg border-2 border-ink px-1.5 py-1 text-[.72rem] leading-tight shadow-[2px_2px_0_var(--line)] hover:z-10"
                          style={{ top, height, background: STATUS_META[a.status].bg }}
                          title={`${a.clientName} · ${a.serviceName}`}
                        >
                          <b className="block truncate">{a.clientName}</b>
                          <span className="block truncate">
                            {formatTime(a.startsAt, tz)} · {STATUS_META[a.status].short}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-ink-2">
        <span>
          <span className="mr-1 inline-block h-3 w-3 rounded bg-mint-soft align-middle" /> Bookable hours
        </span>
        {(["pending", "confirmed", "completed"] as const).map((s) => (
          <span key={s}>
            <span className="mr-1 inline-block h-3 w-3 rounded border border-ink align-middle" style={{ background: STATUS_META[s].bg }} /> {STATUS_META[s].short}
          </span>
        ))}
      </p>
    </>
  );
}
