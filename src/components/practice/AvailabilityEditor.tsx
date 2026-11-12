"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addOverride, deleteOverride, saveSchedulingSettings, saveWeeklyHours } from "@/app/practice-actions";

type Period = { start: string; end: string };
type Rule = { weekday: number; startMinute: number; endMinute: number };
type Override = { id: string; kind: "blocked" | "custom_hours"; startDate: string; endDate: string; startMinute: number | null; endMinute: number | null; reason: string | null };
type Settings = { bufferMinutes: number; minNoticeHours: number; maxAdvanceDays: number; timezone: string; autoConfirm: boolean; acceptingClients: boolean };

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const ZONES = ["Africa/Accra", "Africa/Lagos", "Europe/London", "America/New_York", "Asia/Dubai"];

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ text: r.ok ? (r.message ?? "Saved.") : (r.error ?? "Something went wrong."), ok: r.ok });
      if (r.ok) {
        onOk?.();
        router.refresh();
      }
    });
  return { pending, msg, run };
}

function Msg({ msg }: { msg: { text: string; ok: boolean } | null }) {
  if (!msg) return null;
  return (
    <p role={msg.ok ? "status" : "alert"} className={`rounded-xl border-2 border-ink px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-mint-soft" : "bg-coral-soft"}`}>
      {msg.text}
    </p>
  );
}

export function WeeklyHoursEditor({ rules }: { rules: Rule[] }) {
  const [week, setWeek] = useState<Record<number, Period[]>>(() => {
    const w: Record<number, Period[]> = {};
    for (const d of DAYS) w[d] = rules.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute).map((r) => ({ start: hhmm(r.startMinute), end: r.endMinute === 1440 ? "24:00" : hhmm(r.endMinute) }));
    return w;
  });
  const { pending, msg, run } = useRun();
  const set = (d: number, periods: Period[]) => setWeek((w) => ({ ...w, [d]: periods }));
  const totalHours = Object.values(week)
    .flat()
    .reduce((acc, p) => {
      const [sh, sm] = p.start.split(":").map(Number);
      const [eh, em] = p.end.split(":").map(Number);
      return acc + Math.max(0, eh * 60 + em - (sh * 60 + sm)) / 60;
    }, 0);

  return (
    <section className="panel p-5" aria-labelledby="weekly">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="weekly" className="!text-xl">
            Weekly hours
          </h2>
          <p className="text-sm text-ink-2">Your regular working pattern. Add several periods to a day to leave room for lunch or other work.</p>
        </div>
        <span className="badge bg-blue-soft">{totalHours.toFixed(1)} h / week</span>
      </div>
      <ul className="divide-y divide-ink/10">
        {DAYS.map((d) => {
          const periods = week[d];
          const on = periods.length > 0;
          return (
            <li key={d} className="grid gap-3 py-3 sm:grid-cols-[150px_1fr]">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-[var(--blue)]" checked={on} onChange={() => set(d, on ? [] : [{ start: "09:00", end: "17:00" }])} />
                {DAY_NAME[d]}
              </label>
              <div className="grid gap-2">
                {!on && <span className="text-sm text-ink-2">Unavailable</span>}
                {periods.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`s-${d}-${i}`}>
                      {DAY_NAME[d]} period {i + 1} start
                    </label>
                    <input id={`s-${d}-${i}`} type="time" step={900} className="input-sm" value={p.start} onChange={(e) => set(d, periods.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                    <span aria-hidden>–</span>
                    <label className="sr-only" htmlFor={`e-${d}-${i}`}>
                      {DAY_NAME[d]} period {i + 1} end
                    </label>
                    <input id={`e-${d}-${i}`} type="time" step={900} className="input-sm" value={p.end === "24:00" ? "23:59" : p.end} onChange={(e) => set(d, periods.map((x, j) => (j === i ? { ...x, end: e.target.value === "23:59" ? "24:00" : e.target.value } : x)))} />
                    <button type="button" className="text-sm font-semibold underline" onClick={() => set(d, periods.filter((_, j) => j !== i))} aria-label={`Remove ${DAY_NAME[d]} period ${i + 1}`}>
                      Remove
                    </button>
                  </div>
                ))}
                {on && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="w-fit text-sm font-semibold text-blue underline"
                      onClick={() => {
                        const last = periods[periods.length - 1];
                        const [h] = last.end.split(":").map(Number);
                        set(d, [...periods, { start: `${String(Math.min(h + 1, 22)).padStart(2, "0")}:00`, end: `${String(Math.min(h + 3, 23)).padStart(2, "0")}:00` }]);
                      }}
                    >
                      + Add period
                    </button>
                    {d === 1 && (
                      <button type="button" className="w-fit text-sm font-semibold text-blue underline" onClick={() => setWeek((w) => ({ ...w, 2: [...w[1]], 3: [...w[1]], 4: [...w[1]], 5: [...w[1]] }))}>
                        Copy to Tue–Fri
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 grid gap-3">
        <Msg msg={msg} />
        <button className="btn btn-primary btn-sm w-fit" disabled={pending} onClick={() => run(() => saveWeeklyHours(DAYS.flatMap((d) => week[d].map((p) => ({ weekday: d, ...p })))))}>
          {pending ? "Saving…" : "Save weekly hours"}
        </button>
      </div>
    </section>
  );
}

export function BookingRulesForm({ settings }: { settings: Settings }) {
  const [s, setS] = useState(settings);
  const { pending, msg, run } = useRun();
  const zones = ZONES.includes(s.timezone) ? ZONES : [s.timezone, ...ZONES];
  return (
    <section className="panel grid gap-4 p-5" aria-labelledby="rules">
      <div>
        <h2 id="rules" className="!text-xl">
          Booking rules
        </h2>
        <p className="text-sm text-ink-2">These shape which slots clients see. Session length comes from each service.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="buf">Break between sessions (minutes)</label>
          <input id="buf" type="number" min={0} max={120} step={5} value={s.bufferMinutes} onChange={(e) => setS({ ...s, bufferMinutes: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="notice">Minimum booking notice (hours)</label>
          <input id="notice" type="number" min={0} max={336} value={s.minNoticeHours} onChange={(e) => setS({ ...s, minNoticeHours: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="adv">How far ahead clients can book (days)</label>
          <input id="adv" type="number" min={1} max={365} value={s.maxAdvanceDays} onChange={(e) => setS({ ...s, maxAdvanceDays: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="tz">Your time zone</label>
          <select id="tz" value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--blue)]" checked={s.autoConfirm} onChange={(e) => setS({ ...s, autoConfirm: e.target.checked })} />
        <span>
          <b>Confirm bookings automatically.</b> Otherwise each booking arrives as a request you accept or decline.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--blue)]" checked={s.acceptingClients} onChange={(e) => setS({ ...s, acceptingClients: e.target.checked })} />
        <span>
          <b>Accepting new bookings.</b> Turn off to pause bookings without changing your hours. Existing sessions are kept.
        </span>
      </label>
      <Msg msg={msg} />
      <button className="btn btn-primary btn-sm w-fit" disabled={pending} onClick={() => run(() => saveSchedulingSettings(s))}>
        {pending ? "Saving…" : "Save booking rules"}
      </button>
    </section>
  );
}

export function OverridesEditor({ overrides, today }: { overrides: Override[]; today: string }) {
  const [kind, setKind] = useState<"blocked" | "custom_hours">("blocked");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("14:00");
  const [reason, setReason] = useState("");
  const { pending, msg, run } = useRun();
  const fmt = (d: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${d}T12:00:00Z`));

  return (
    <section className="panel grid gap-5 p-5" aria-labelledby="dates">
      <div>
        <h2 id="dates" className="!text-xl">
          Date-specific changes
        </h2>
        <p className="text-sm text-ink-2">Block out holidays and leave, or set different hours for a single date. These override your weekly hours.</p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border-2 border-dashed border-ink/40 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addOverride({ kind, startDate, endDate: kind === "blocked" ? endDate : startDate, start, end, reason }), () => setReason(""));
        }}
      >
        <div role="radiogroup" aria-label="Change type" className="flex flex-wrap gap-2">
          {(
            [
              ["blocked", "Time off / holiday"],
              ["custom_hours", "Different hours on a date"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="chip-check">
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="field">
            <label htmlFor="sd">{kind === "blocked" ? "From" : "Date"}</label>
            <input id="sd" type="date" min={today} required value={startDate} onChange={(e) => (setStartDate(e.target.value), endDate < e.target.value && setEndDate(e.target.value))} />
          </div>
          {kind === "blocked" ? (
            <div className="field">
              <label htmlFor="ed">Until (inclusive)</label>
              <input id="ed" type="date" min={startDate} required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="ost">From</label>
                <input id="ost" type="time" step={900} required value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="oen">To</label>
                <input id="oen" type="time" step={900} required value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </>
          )}
          <div className="field min-w-[180px] flex-1">
            <label htmlFor="rsn">Label (optional, private)</label>
            <input id="rsn" maxLength={120} placeholder={kind === "blocked" ? "e.g. Annual leave" : "e.g. Conference afternoon"} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" disabled={pending}>
            Add
          </button>
        </div>
        <Msg msg={msg} />
      </form>

      {overrides.length ? (
        <ul className="divide-y divide-ink/10">
          {overrides.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span>
                <span className="badge mr-2" style={{ background: o.kind === "blocked" ? "var(--coral-soft)" : "var(--blue-soft)" }}>
                  {o.kind === "blocked" ? "Off" : "Custom hours"}
                </span>
                <b className="text-sm">{o.startDate === o.endDate ? fmt(o.startDate) : `${fmt(o.startDate)} – ${fmt(o.endDate)}`}</b>
                {o.kind === "custom_hours" && o.startMinute != null && (
                  <span className="text-sm">
                    {" "}
                    · {hhmm(o.startMinute)}–{hhmm(o.endMinute!)}
                  </span>
                )}
                {o.reason && <span className="text-sm text-ink-2"> · {o.reason}</span>}
              </span>
              <button className="text-sm font-semibold underline" disabled={pending} onClick={() => run(() => deleteOverride(o.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">No upcoming changes. Your weekly hours apply every week.</p>
      )}
    </section>
  );
}
