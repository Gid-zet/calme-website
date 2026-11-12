import { addDays, localDateOf, weekdayOf, zonedToUtc } from "./time";

export type WeeklyRule = { weekday: number; startMinute: number; endMinute: number };
export type Override =
  | { kind: "blocked"; startDate: string; endDate: string; startMinute?: number | null; endMinute?: number | null }
  | { kind: "custom_hours"; startDate: string; endDate: string; startMinute: number | null; endMinute: number | null };
export type Busy = { start: Date; end: Date };

export type ScheduleInput = {
  timeZone: string; // psychologist's IANA zone; rules and overrides are wall-clock times in it
  rules: WeeklyRule[];
  overrides: Override[];
  busy: Busy[]; // pending + confirmed appointments
  durationMinutes: number;
  bufferMinutes: number; // break kept free after (and before) every session
  minNoticeHours: number;
  maxAdvanceDays: number;
  now: Date;
};

type Interval = { start: number; end: number };

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

/** Working periods (minutes after local midnight) for one local date, after applying overrides. */
export function workingIntervalsFor(date: string, rules: WeeklyRule[], overrides: Override[]): Interval[] {
  if (overrides.some((o) => o.kind === "blocked" && o.startDate <= date && date <= o.endDate)) return [];
  const custom = overrides.filter((o) => o.kind === "custom_hours" && o.startDate === date && o.startMinute != null && o.endMinute != null);
  if (custom.length) {
    // Date-specific hours replace the weekly hours for that day (Cal.com semantics).
    return mergeIntervals(custom.map((o) => ({ start: o.startMinute!, end: o.endMinute! })));
  }
  const weekday = weekdayOf(date);
  return mergeIntervals(rules.filter((r) => r.weekday === weekday).map((r) => ({ start: r.startMinute, end: r.endMinute })));
}

/**
 * Bookable start times between two psychologist-local dates (inclusive).
 *
 * A slot is offered when:
 *  - it sits fully inside a working period for that date (weekly hours, or that date's override),
 *  - it starts after now + minimum notice and before now + booking horizon,
 *  - it doesn't overlap any pending/confirmed appointment, keeping `bufferMinutes` free on each side.
 * Slots step by duration + buffer from the start of each working period, so times stay predictable.
 */
export function computeSlots(input: ScheduleInput, fromDate: string, toDate: string): Date[] {
  const { timeZone, durationMinutes, bufferMinutes } = input;
  if (durationMinutes <= 0) return [];
  const earliest = input.now.getTime() + input.minNoticeHours * 3600_000;
  const latest = input.now.getTime() + input.maxAdvanceDays * 86400_000;
  const step = (durationMinutes + bufferMinutes) * 60_000;
  const length = durationMinutes * 60_000;
  const buffer = bufferMinutes * 60_000;
  const busy = input.busy.map((b) => ({ start: b.start.getTime() - buffer, end: b.end.getTime() + buffer }));

  const out: Date[] = [];
  const seen = new Set<number>();
  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) {
    for (const iv of workingIntervalsFor(date, input.rules, input.overrides)) {
      const periodStart = zonedToUtc(date, iv.start, timeZone).getTime();
      const periodEnd = zonedToUtc(date, iv.end, timeZone).getTime();
      for (let s = periodStart; s + length <= periodEnd; s += step) {
        const e = s + length;
        if (s < earliest || s > latest) continue;
        if (busy.some((b) => b.start < e && b.end > s)) continue;
        if (!seen.has(s)) {
          seen.add(s);
          out.push(new Date(s));
        }
      }
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** Server-side re-check used when a booking is submitted: is this exact start time offered right now? */
export function isSlotAvailable(input: ScheduleInput, start: Date): boolean {
  const date = localDateOf(start, input.timeZone);
  // A period can't start on the previous local day and run past midnight (rules end at 24:00),
  // so checking the slot's own local date is sufficient.
  return computeSlots(input, date, date).some((s) => s.getTime() === start.getTime());
}

/** Psychologist-local date range that covers a window of client-local dates in another zone. */
export function coveringDates(fromInstant: Date, toInstant: Date, timeZone: string) {
  return { from: addDays(localDateOf(fromInstant, timeZone), -1), to: addDays(localDateOf(toInstant, timeZone), 1) };
}
