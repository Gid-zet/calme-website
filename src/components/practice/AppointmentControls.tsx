"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelAsPsychologist, recordOutcome, rescheduleAsPsychologist, respondToRequest, saveMeetingDetails } from "@/app/practice-actions";
import { SlotPicker } from "../booking/SlotPicker";

type R = { ok: true; message?: string } | { ok: false; error: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const run = (fn: () => Promise<R>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { text: r.message ?? "Done.", ok: true } : { text: r.error, ok: false });
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

/** Accept / decline a pending request (compact, used in lists). */
export function RequestButtons({ id }: { id: string }) {
  const { pending, msg, run } = useAction();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm bg-mint" disabled={pending} onClick={() => run(() => respondToRequest(id, "accept"))}>
          Accept
        </button>
        <button className="btn btn-white btn-sm" disabled={pending} onClick={() => setDeclining((d) => !d)} aria-expanded={declining}>
          Decline
        </button>
      </div>
      {declining && (
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor={`decline-${id}`}>
            Reason for declining
          </label>
          <input id={`decline-${id}`} className="input-sm min-w-0 flex-1" placeholder="Short reason for the client" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
          <button className="btn btn-sm bg-coral" disabled={pending || !reason.trim()} onClick={() => run(() => respondToRequest(id, "decline", reason))}>
            Send
          </button>
        </div>
      )}
      <Msg msg={msg} />
    </div>
  );
}

/** Full controls on the appointment detail page. */
export function AppointmentControls(p: {
  id: string;
  status: string;
  started: boolean;
  serviceId: string | null;
  timeZone: string;
  mode: string;
  meetingDetails: string | null;
}) {
  const { pending, msg, run } = useAction();
  const [panel, setPanel] = useState<"none" | "cancel" | "reschedule">("none");
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState<string | null>(null);
  const [details, setDetails] = useState(p.meetingDetails ?? "");
  const active = p.status === "pending" || p.status === "confirmed";

  return (
    <div className="grid gap-4">
      <Msg msg={msg} />
      {p.status === "pending" && <RequestButtons id={p.id} />}

      {p.status === "confirmed" && (
        <div className="panel grid gap-2 p-4">
          <label htmlFor="details" className="text-sm font-bold">
            {p.mode === "online" ? "Video link & joining instructions" : "Address & arrival instructions"} (visible to the client)
          </label>
          <textarea id="details" className="input-sm min-h-[70px]" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={p.mode === "online" ? "e.g. https://meet.google.com/…" : "e.g. Suite 4, 2nd floor…"} />
          <button className="btn btn-white btn-sm w-fit" disabled={pending} onClick={() => run(() => saveMeetingDetails(p.id, details))}>
            Save details
          </button>
        </div>
      )}

      {p.status === "confirmed" && p.started && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">Record outcome:</span>
          <button className="btn btn-sm bg-blue-soft" disabled={pending} onClick={() => run(() => recordOutcome(p.id, "completed"))}>
            Completed
          </button>
          <button className="btn btn-white btn-sm" disabled={pending} onClick={() => run(() => recordOutcome(p.id, "no_show"))}>
            Client didn&apos;t attend
          </button>
        </div>
      )}

      {active && !p.started && (
        <div className="flex flex-wrap gap-2">
          {p.serviceId && (
            <button className="btn btn-white btn-sm" onClick={() => setPanel(panel === "reschedule" ? "none" : "reschedule")}>
              Reschedule
            </button>
          )}
          <button className="btn btn-white btn-sm" onClick={() => setPanel(panel === "cancel" ? "none" : "cancel")}>
            Cancel session
          </button>
        </div>
      )}

      {panel === "reschedule" && p.serviceId && (
        <div className="panel grid gap-3 p-4">
          <b>Move to a new time</b>
          <p className="text-sm text-ink-2">Only times inside your published availability are offered. The client is notified and the session stays confirmed.</p>
          <SlotPicker serviceId={p.serviceId} timeZone={p.timeZone} value={newStart} onChange={setNewStart} excludeAppointmentId={p.id} />
          <button className="btn btn-primary btn-sm w-fit" disabled={!newStart || pending} onClick={() => newStart && run(() => rescheduleAsPsychologist(p.id, newStart), () => setPanel("none"))}>
            Confirm new time
          </button>
        </div>
      )}

      {panel === "cancel" && (
        <div className="panel grid gap-3 p-4">
          <label htmlFor="creason" className="font-bold">
            Reason for cancelling (sent to the client)
          </label>
          <textarea id="creason" className="input-sm min-h-[70px]" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn btn-sm w-fit bg-coral" disabled={pending || !reason.trim()} onClick={() => run(() => cancelAsPsychologist(p.id, reason), () => setPanel("none"))}>
            Cancel session
          </button>
        </div>
      )}
    </div>
  );
}
