"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bookAppointment } from "@/app/client-actions";
import { formatMoney, MODE_LABEL } from "@/lib/format";
import { Icon } from "../ui/Icon";
import { SlotPicker } from "./SlotPicker";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceMinor: number; currency: string; modes: ("online" | "in_person")[] };

const STEPS = ["Service", "Date & time", "Details", "Review"];

export function BookingWizard({
  psychologist,
  services,
  timeZone,
  initialServiceId,
  initialStart,
  policy,
}: {
  psychologist: { id: string; name: string; title: string; autoConfirm: boolean; location: string | null };
  services: Service[];
  timeZone: string;
  initialServiceId?: string;
  initialStart?: string;
  policy: string;
}) {
  const router = useRouter();
  const preselected = services.find((s) => s.id === initialServiceId) ?? (services.length === 1 ? services[0] : undefined);
  const [step, setStep] = useState(preselected ? (initialStart ? 1 : 1) : 0);
  const [serviceId, setServiceId] = useState<string | null>(preselected?.id ?? null);
  const [start, setStart] = useState<string | null>(initialStart ?? null);
  const service = services.find((s) => s.id === serviceId);
  const [mode, setMode] = useState<"online" | "in_person" | null>(service?.modes.length === 1 ? service.modes[0] : null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canNext = [Boolean(service), Boolean(start), Boolean(mode), true][step];
  const when = start
    ? new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(start))
    : null;

  const confirm = () => {
    if (!service || !start || !mode) return;
    setError(null);
    startTransition(async () => {
      const res = await bookAppointment({ serviceId: service.id, startsAt: start, mode, note: note || undefined, timezone: timeZone });
      if (res.ok) router.push(`/dashboard/appointments/${res.id}?booked=1`);
      else {
        setError(res.error);
        // The slot may have been taken: send them back to pick another one.
        if (/taken|overlap|available/i.test(res.error)) {
          setStart(null);
          setStep(1);
        }
      }
    });
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_340px]">
      <div className="card-pop p-[clamp(1.2rem,4vw,2.2rem)]">
        <ol className="mb-8 flex gap-2" aria-label="Booking steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1" aria-current={i === step ? "step" : undefined}>
              <div className={`h-2.5 rounded-full border-2 border-ink transition-colors ${i <= step ? "bg-blue" : "bg-white"}`} />
              <span className={`mt-1.5 block text-[.68rem] font-bold uppercase tracking-[.08em] sm:text-xs ${i === step ? "text-ink" : "text-ink-2/60"}`}>{s}</span>
            </li>
          ))}
        </ol>

        {error && (
          <p role="alert" className="mb-5 rounded-2xl border-2 border-ink bg-coral-soft px-4 py-3 font-semibold">
            {error}
          </p>
        )}

        <div key={step} style={{ animation: "fade .25s" }}>
          {step === 0 && (
            <fieldset>
              <legend className="mb-5 font-display text-2xl font-bold">Which session would you like?</legend>
              <div className="grid gap-3">
                {services.map((s) => (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-[20px] border-[2.5px] border-ink p-4 transition focus-within:ring-2 focus-within:ring-blue ${serviceId === s.id ? "bg-blue-soft shadow-[4px_4px_0_var(--blue)]" : "bg-white shadow-[3px_3px_0_var(--line)]"}`}
                  >
                    <input
                      type="radio"
                      name="service"
                      className="sr-only"
                      checked={serviceId === s.id}
                      onChange={() => {
                        setServiceId(s.id);
                        setStart(null);
                        setMode(s.modes.length === 1 ? s.modes[0] : null);
                      }}
                    />
                    <span>
                      <b className="block font-display text-lg">{s.name}</b>
                      <span className="text-sm text-ink-2">
                        {s.durationMinutes} min · {s.modes.map((m) => MODE_LABEL[m]).join(" or ")}
                      </span>
                      {s.description && <span className="mt-1 block text-sm text-ink-2">{s.description}</span>}
                    </span>
                    <b className="text-lg">{formatMoney(s.priceMinor, s.currency)}</b>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && service && (
            <>
              <h2 className="mb-5 !text-2xl">Pick a day &amp; time</h2>
              <SlotPicker serviceId={service.id} timeZone={timeZone} value={start} onChange={setStart} />
            </>
          )}

          {step === 2 && service && (
            <div className="grid gap-5">
              <h2 className="!text-2xl">A couple of details</h2>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">How would you like to meet?</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {service.modes.map((m) => (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center gap-3 rounded-[18px] border-[2.5px] border-ink p-4 focus-within:ring-2 focus-within:ring-blue ${mode === m ? "bg-mint-soft shadow-[4px_4px_0_var(--blue)]" : "bg-white"}`}
                    >
                      <input type="radio" name="mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
                      <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-white">
                        <Icon name={m === "online" ? "video" : "pin"} className="h-5 w-5" />
                      </span>
                      <span>
                        <b className="block">{MODE_LABEL[m]}</b>
                        <span className="text-xs text-ink-2">{m === "online" ? "Link shared once confirmed" : (psychologist.location ?? "Address shared once confirmed")}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="note">
                  Anything you&apos;d like {psychologist.name.split(" ")[0] === "Dr." ? psychologist.name : psychologist.name.split(" ")[0]} to know beforehand? <span className="font-medium text-ink-2">(optional)</span>
                </label>
                <textarea id="note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Share as much or as little as you like." />
                <p className="text-xs text-ink-2">🔒 Only your psychologist can read this. CalMe staff can&apos;t. Please don&apos;t include anything you&apos;d need urgent help with.</p>
              </div>
            </div>
          )}

          {step === 3 && service && start && mode && (
            <div className="grid gap-4">
              <h2 className="!text-2xl">Review &amp; confirm</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Psychologist", `${psychologist.name}, ${psychologist.title}`],
                  ["Session", `${service.name} · ${service.durationMinutes} min`],
                  ["When", when],
                  ["How", MODE_LABEL[mode]],
                  ["Fee", formatMoney(service.priceMinor, service.currency)],
                  ["Confirmation", psychologist.autoConfirm ? "Instant" : "Your psychologist confirms the request"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl border-2 border-ink bg-cream px-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-[.1em] text-ink-2">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-ink-2">{policy} The fee is paid directly to your psychologist.</p>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-between gap-3">
          <button type="button" onClick={() => setStep((s) => s - 1)} className={`btn btn-white ${step === 0 ? "invisible" : ""}`}>
            ← Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="btn btn-primary disabled:pointer-events-none disabled:opacity-40">
              Continue <Icon name="arrow" strokeWidth={2.5} />
            </button>
          ) : (
            <button type="button" onClick={confirm} disabled={pending} aria-busy={pending} className="btn btn-sun disabled:opacity-70">
              {pending ? "Booking…" : psychologist.autoConfirm ? "Confirm booking" : "Send booking request"}
            </button>
          )}
        </div>
      </div>

      <aside className="rounded-[28px] border-[2.5px] border-ink bg-ink p-6 text-cream shadow-[6px_6px_0_var(--sun)] lg:sticky lg:top-28">
        <span className="hand text-2xl text-sun">your session</span>
        <dl className="mt-4 grid gap-3">
          {[
            ["With", psychologist.name],
            ["Session", service ? `${service.name} · ${service.durationMinutes} min` : null],
            ["When", when],
            ["How", mode ? MODE_LABEL[mode] : null],
            ["Fee", service ? formatMoney(service.priceMinor, service.currency) : null],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white/10 px-4 py-3">
              <dt className="text-xs font-bold uppercase tracking-[.1em] text-[#b9bedf]">{k}</dt>
              <dd className="font-semibold">{v || <span className="text-[#b9bedf]">Not selected yet</span>}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-sm text-[#b9bedf]">
          In crisis? Don&apos;t wait for an appointment.{" "}
          <Link href="/resources#crisis" className="font-bold text-sun underline">
            Get help now
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}
