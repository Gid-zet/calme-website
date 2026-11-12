"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelAsClient, reportIssue, rescheduleAsClient, submitReview } from "@/app/client-actions";
import { SlotPicker } from "./SlotPicker";

type Props = {
  appointmentId: string;
  serviceId: string | null;
  timeZone: string;
  canChange: boolean; // pending/confirmed and in the future
  canReschedule: boolean;
  rescheduleBlockedReason?: string;
  lateCancel: boolean;
  canReview: boolean;
  policy: string;
};

function Message({ text, ok }: { text: string | null; ok?: boolean }) {
  if (!text) return null;
  return (
    <p role={ok ? "status" : "alert"} className={`rounded-2xl border-2 border-ink px-4 py-3 text-sm font-semibold ${ok ? "bg-mint-soft" : "bg-coral-soft"}`}>
      {text}
    </p>
  );
}

export function ClientAppointmentActions(p: Props) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "cancel" | "reschedule" | "report">("none");
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { text: r.message ?? "Done.", ok: true } : { text: r.error ?? "Something went wrong." });
      if (r.ok) {
        setPanel("none");
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="grid gap-4">
      <Message text={msg?.text ?? null} ok={msg?.ok} />
      {p.canChange && (
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-white btn-sm" onClick={() => setPanel(panel === "reschedule" ? "none" : "reschedule")} disabled={!p.canReschedule} title={p.rescheduleBlockedReason}>
            Reschedule
          </button>
          <button className="btn btn-white btn-sm" onClick={() => setPanel(panel === "cancel" ? "none" : "cancel")}>
            Cancel appointment
          </button>
        </div>
      )}
      {p.canChange && !p.canReschedule && p.rescheduleBlockedReason && <p className="text-sm text-ink-2">{p.rescheduleBlockedReason}</p>}

      {panel === "reschedule" && p.serviceId && (
        <div className="panel grid gap-4 p-5" style={{ animation: "fade .2s" }}>
          <b className="font-display text-lg">Choose a new time</b>
          <SlotPicker serviceId={p.serviceId} timeZone={p.timeZone} value={newStart} onChange={setNewStart} excludeAppointmentId={p.appointmentId} />
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm" disabled={!newStart || pending} onClick={() => newStart && run(() => rescheduleAsClient(p.appointmentId, newStart))}>
              {pending ? "Moving…" : "Confirm new time"}
            </button>
            <button className="btn btn-white btn-sm" onClick={() => setPanel("none")}>
              Keep current time
            </button>
          </div>
        </div>
      )}

      {panel === "cancel" && (
        <div className="panel grid gap-3 p-5" style={{ animation: "fade .2s" }}>
          <b className="font-display text-lg">Cancel this appointment?</b>
          {p.lateCancel && <p className="rounded-xl bg-sun-soft px-3 py-2 text-sm font-semibold">This is within the cancellation window, so it will be recorded as a late cancellation.</p>}
          <p className="text-sm text-ink-2">{p.policy}</p>
          <div className="field">
            <label htmlFor="reason">Reason (optional, shared with your psychologist)</label>
            <textarea id="reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="!min-h-[80px]" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm bg-coral" disabled={pending} onClick={() => run(() => cancelAsClient(p.appointmentId, reason))}>
              {pending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button className="btn btn-white btn-sm" onClick={() => setPanel("none")}>
              Keep appointment
            </button>
          </div>
        </div>
      )}

      {p.canReview && <ReviewForm appointmentId={p.appointmentId} onDone={() => router.refresh()} />}

      <div>
        <button className="text-sm font-semibold text-ink-2 underline" onClick={() => setPanel(panel === "report" ? "none" : "report")}>
          Report a problem with this appointment
        </button>
        {panel === "report" && <ReportForm appointmentId={p.appointmentId} onDone={(m) => (setMsg({ text: m, ok: true }), setPanel("none"))} />}
      </div>
    </div>
  );
}

function ReviewForm({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="panel grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await submitReview(appointmentId, rating, comment);
          if (r.ok) onDone();
          else setErr(r.error);
        });
      }}
    >
      <b className="font-display text-lg">How was your session?</b>
      <fieldset>
        <legend className="sr-only">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-3xl leading-none">
              <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <span aria-hidden className={n <= rating ? "text-[#e3a008]" : "text-ink/20"}>
                ★
              </span>
              <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="comment">A few words for others (optional, shown with your first name)</label>
        <textarea id="comment" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className="!min-h-[80px]" />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-[#c2410c]">{err}</p>}
      <button className="btn btn-primary btn-sm w-fit" disabled={!rating || pending}>
        {pending ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}

export function ReportForm({ appointmentId, onDone }: { appointmentId?: string; onDone: (msg: string) => void }) {
  const [category, setCategory] = useState("scheduling");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="panel mt-3 grid gap-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await reportIssue({ appointmentId, category, message });
          if (r.ok) onDone(r.message ?? "Report sent.");
          else setErr(r.error);
        });
      }}
    >
      <div className="field">
        <label htmlFor="cat">What&apos;s the problem about?</label>
        <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="scheduling">Scheduling</option>
          <option value="technical">Technical problem</option>
          <option value="conduct">Professional conduct</option>
          <option value="billing">Fees</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="msg">Tell us what happened</label>
        <textarea id="msg" required minLength={10} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} className="!min-h-[90px]" />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-[#c2410c]">{err}</p>}
      <button className="btn btn-primary btn-sm w-fit" disabled={pending}>
        {pending ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
