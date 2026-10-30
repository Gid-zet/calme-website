"use client";

import Link from "next/link";
import { useState } from "react";
import { concerns } from "@/lib/content";
import { Icon, type IconName } from "../ui/Icon";

const sessionTypes: { key: string; icon: IconName; title: string; body: string; bg: string }[] = [
  { key: "video", icon: "video", title: "Video call", body: "Talk from wherever you feel comfortable.", bg: "var(--blue-soft)" },
  { key: "in-person", icon: "pin", title: "In person", body: "Meet a psychologist at our centre.", bg: "var(--mint-soft)" },
  { key: "phone", icon: "phone", title: "Phone call", body: "Just your voice, no camera needed.", bg: "var(--sun-soft)" },
];

const times = ["9:00 AM", "10:30 AM", "12:00 PM", "2:00 PM", "3:30 PM", "5:00 PM"];
const steps = ["Session", "Topic", "Time", "Details"];

// Next 12 open days, skipping Sundays (closed)
function upcomingDays() {
  const out: Date[] = [];
  const d = new Date();
  while (out.length < 12) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) out.push(new Date(d));
  }
  return out;
}

export function BookingFlow() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [day, setDay] = useState<number | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [days, setDays] = useState<Date[]>([]);

  const canNext = [type, topics.length, day !== null && time, true][step];
  const selectedType = sessionTypes.find((s) => s.key === type);

  if (done) {
    return (
      <div className="card-pop mx-auto max-w-xl p-10 text-center" style={{ animation: "fade .3s" }}>
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border-[2.5px] border-ink bg-mint text-4xl">💙</div>
        <h2 className="!text-4xl">You&apos;re booked in!</h2>
        <p className="lede mx-auto mt-3">
          {selectedType?.title} on {day !== null && days[day].toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at {time}.
          We&apos;ve sent the details to your email.
        </p>
        <Link href="/" className="btn btn-sun mt-8">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
      <div className="card-pop p-[clamp(1.4rem,4vw,2.4rem)]">
        {/* progress */}
        <ol className="mb-8 flex gap-2">
          {steps.map((s, i) => (
            <li key={s} className="flex-1">
              <div className={`h-2.5 rounded-full border-2 border-ink transition-colors ${i <= step ? "bg-blue" : "bg-white"}`} />
              <span className={`mt-1.5 block text-xs font-bold uppercase tracking-[.08em] ${i === step ? "text-ink" : "text-ink-2/60"}`}>{s}</span>
            </li>
          ))}
        </ol>

        <div key={step} style={{ animation: "fade .3s" }}>
          {step === 0 && (
            <>
              <h3 className="mb-5 !text-2xl">How would you like to meet?</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {sessionTypes.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setType(s.key)}
                    className={`rounded-[22px] border-[2.5px] border-ink p-5 text-left transition hover:-translate-y-1 ${type === s.key ? "shadow-[5px_5px_0_var(--blue)] ring-2 ring-blue" : "shadow-[3px_3px_0_var(--line)]"}`}
                    style={{ background: s.bg }}
                  >
                    <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-white">
                      <Icon name={s.icon} className="h-6 w-6" />
                    </span>
                    <b className="block font-display text-lg">{s.title}</b>
                    <span className="text-sm text-ink-2">{s.body}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3 className="mb-2 !text-2xl">What would you like to talk about?</h3>
              <p className="mb-5 text-ink-2">Pick as many as you like. It helps us match you with the right psychologist.</p>
              <div className="flex flex-wrap gap-2.5">
                {concerns.map((c) => {
                  const on = topics.includes(c);
                  return (
                    <button
                      key={c}
                      onClick={() => setTopics((t) => (on ? t.filter((x) => x !== c) : [...t, c]))}
                      aria-pressed={on}
                      className={`rounded-full border-2 border-ink px-4 py-2 font-semibold transition ${on ? "bg-sun shadow-[3px_3px_0_var(--line)]" : "bg-white hover:bg-sun-soft"}`}
                    >
                      {on && "✓ "}
                      {c}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="mb-5 !text-2xl">Pick a day &amp; time</h3>
              <div className="-mx-1 mb-6 flex gap-2.5 overflow-x-auto px-1 pb-3">
                {days.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDay(i)}
                    className={`flex w-[68px] shrink-0 flex-col items-center rounded-[18px] border-2 border-ink py-3 transition ${day === i ? "bg-blue text-white shadow-[3px_3px_0_var(--line)]" : "bg-white hover:bg-blue-soft"}`}
                  >
                    <span className="text-xs font-bold uppercase">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                    <span className="font-display text-2xl font-bold">{d.getDate()}</span>
                    <span className="text-xs">{d.toLocaleDateString(undefined, { month: "short" })}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {times.map((t) => (
                  <button
                    key={t}
                    disabled={day === null}
                    onClick={() => setTime(t)}
                    className={`rounded-2xl border-2 border-ink py-3 font-bold transition disabled:opacity-40 ${time === t ? "bg-mint shadow-[3px_3px_0_var(--line)]" : "bg-white hover:bg-mint-soft"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <form
              id="booking"
              onSubmit={(e) => {
                e.preventDefault();
                setDone(true);
              }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <h3 className="!text-2xl sm:col-span-2">Almost there! A few details</h3>
              <div className="field"><label htmlFor="bn">Full name *</label><input id="bn" required autoComplete="name" /></div>
              <div className="field"><label htmlFor="be">Email *</label><input id="be" type="email" required autoComplete="email" /></div>
              <div className="field sm:col-span-2"><label htmlFor="bp">Phone number</label><input id="bp" type="tel" autoComplete="tel" /></div>
              <div className="field sm:col-span-2"><label htmlFor="bnote">Anything you&apos;d like us to know? (optional)</label><textarea id="bnote" placeholder="Share as much or as little as you like." /></div>
              <p className="text-sm text-ink-2 sm:col-span-2">🔒 Everything you share is confidential and only seen by your care team.</p>
            </form>
          )}
        </div>

        <div className="mt-8 flex justify-between gap-3">
          <button onClick={() => setStep((s) => s - 1)} className={`btn btn-white ${step === 0 ? "invisible" : ""}`}>
            ← Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !days.length) setDays(upcomingDays());
                setStep((s) => s + 1);
              }}
              disabled={!canNext} className="btn btn-primary disabled:pointer-events-none disabled:opacity-40">
              Continue <Icon name="arrow" strokeWidth={2.5} />
            </button>
          ) : (
            <button type="submit" form="booking" className="btn btn-sun">
              Confirm booking ✨
            </button>
          )}
        </div>
      </div>

      {/* summary */}
      <aside className="rounded-[28px] border-[2.5px] border-ink bg-ink p-6 text-cream shadow-[6px_6px_0_var(--sun)] lg:sticky lg:top-28">
        <span className="hand text-2xl text-sun">your session</span>
        <dl className="mt-4 grid gap-3">
          {[
            ["Type", selectedType?.title],
            ["Topics", topics.join(", ")],
            ["When", day !== null ? `${days[day].toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}${time ? ` · ${time}` : ""}` : null],
            ["Duration", "50 minutes"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/10 px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#b9bedf]">{k}</dt>
              <dd className="font-semibold">{v || <span className="text-[#b9bedf]">Not selected yet</span>}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-[#b9bedf]">
          In crisis? Don&apos;t wait for an appointment. <Link href="/resources#crisis" className="font-bold text-sun underline">Get help now</Link>.
        </p>
      </aside>
    </div>
  );
}
