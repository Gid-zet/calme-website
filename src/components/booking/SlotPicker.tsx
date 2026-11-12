"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, localDateOf, zonedToUtc } from "@/lib/scheduling/time";

type Props = {
  serviceId: string;
  timeZone: string; // viewer's zone; dates and times are shown in it
  value: string | null; // ISO start
  onChange: (iso: string | null) => void;
  excludeAppointmentId?: string;
};

const fmt = (iso: string, tz: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...o }).format(new Date(iso));

/** Week-at-a-time date strip + time grid, fed by /api/slots (server-computed availability). */
export function SlotPicker({ serviceId, timeZone, value, onChange, excludeAppointmentId }: Props) {
  const today = useMemo(() => localDateOf(new Date(), timeZone), [timeZone]);
  const [weekStart, setWeekStart] = useState(today);
  const [day, setDay] = useState<string | null>(value ? localDateOf(new Date(value), timeZone) : null);
  // Results are tagged with the request they answer; anything for an older request reads as "loading".
  const requestKey = `${serviceId}|${weekStart}|${timeZone}|${excludeAppointmentId ?? ""}`;
  const [result, setResult] = useState<{ key: string; slots?: string[]; error?: string } | null>(null);
  const current = result?.key === requestKey ? result : null;
  const slots = current?.slots ?? null;
  const error = current?.error ?? null;
  const horizonEnd = slots !== null && slots.length === 0 && weekStart > addDays(today, 56);

  useEffect(() => {
    let cancelled = false;
    const from = zonedToUtc(weekStart, 0, timeZone).toISOString();
    const qs = new URLSearchParams({ serviceId, from, days: "7" });
    if (excludeAppointmentId) qs.set("exclude", excludeAppointmentId);
    fetch(`/api/slots?${qs}`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Couldn't load times.");
        return body as { slots: string[] };
      })
      .then((b) => {
        if (cancelled) return;
        setResult({ key: requestKey, slots: b.slots });
        const days = [...new Set(b.slots.map((s) => localDateOf(new Date(s), timeZone)))];
        setDay((d) => (d && days.includes(d) ? d : (days[0] ?? null)));
      })
      .catch((e: Error) => !cancelled && setResult({ key: requestKey, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [serviceId, weekStart, timeZone, excludeAppointmentId, requestKey]);

  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = new Map<string, string[]>();
  for (const s of slots ?? []) {
    const d = localDateOf(new Date(s), timeZone);
    byDay.set(d, [...(byDay.get(d) ?? []), s]);
  }
  const daySlots = day ? (byDay.get(day) ?? []) : [];
  const dateLabel = (d: string, o: Intl.DateTimeFormatOptions) => fmt(`${d}T12:00:00Z`, "UTC", o);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="btn btn-white btn-sm" disabled={weekStart <= today} onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Previous week">
          ←
        </button>
        <b className="text-sm">
          {dateLabel(week[0], { day: "numeric", month: "short" })} – {dateLabel(week[6], { day: "numeric", month: "short", year: "numeric" })}
        </b>
        <button type="button" className="btn btn-white btn-sm" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Next week">
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Choose a date">
        {week.map((d) => {
          const n = byDay.get(d)?.length ?? 0;
          const selected = day === d;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!n}
              onClick={() => setDay(d)}
              className={`flex flex-col items-center rounded-2xl border-2 border-ink py-2 transition disabled:cursor-not-allowed disabled:border-ink/20 disabled:text-ink/35 ${selected ? "bg-blue text-white shadow-[3px_3px_0_var(--line)]" : "bg-white hover:bg-blue-soft"}`}
            >
              <span className="text-[.65rem] font-bold uppercase">{dateLabel(d, { weekday: "short" })}</span>
              <span className="font-display text-xl font-bold leading-tight">{dateLabel(d, { day: "numeric" })}</span>
              <span className={`text-[.65rem] ${selected ? "" : "text-ink-2"}`}>{slots === null ? "·" : n ? `${n} free` : "–"}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 min-h-[120px]" aria-live="polite">
        {error ? (
          <p className="rounded-2xl border-2 border-ink bg-coral-soft px-4 py-3 text-sm font-semibold">{error}</p>
        ) : slots === null ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-2xl bg-ink/10" />
            ))}
          </div>
        ) : !slots.length ? (
          <p className="text-sm text-ink-2">{horizonEnd ? "Bookings aren't open this far ahead yet." : "No free times this week. Try the next week."}</p>
        ) : (
          <>
            <p className="mb-2 text-sm font-bold">{day && dateLabel(day, { weekday: "long", day: "numeric", month: "long" })}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Choose a time">
              {daySlots.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={value === s}
                  onClick={() => onChange(s)}
                  className={`rounded-2xl border-2 border-ink py-2.5 font-bold transition ${value === s ? "bg-mint shadow-[3px_3px_0_var(--line)]" : "bg-white hover:bg-mint-soft"}`}
                >
                  {fmt(s, timeZone, { hour: "numeric", minute: "2-digit", hour12: true })}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-2">Times are shown in your time zone: {timeZone.replace(/_/g, " ")}.</p>
    </div>
  );
}
