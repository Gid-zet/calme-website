"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inviteAdmin, reviewApplication, savePlatformSettings, saveSpecialization, setAccountStatus, updateReport } from "@/app/admin-actions";

type R = { ok: true; message?: string } | { ok: false; error: string };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const run = (fn: () => Promise<R>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg({ text: r.ok ? (r.message ?? "Done.") : r.error, ok: r.ok });
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

/** A button that runs a bound server action (e.g. setServiceActive.bind(null, id, false)). */
export function ActionButton({ action, label, className = "btn btn-white btn-sm", confirmText }: { action: () => Promise<R>; label: string; className?: string; confirmText?: string }) {
  const { pending, msg, run } = useRun();
  return (
    <span className="inline-grid gap-1">
      <button className={className} disabled={pending} onClick={() => (!confirmText || confirm(confirmText)) && run(action)}>
        {pending ? "…" : label}
      </button>
      {msg && !msg.ok && <span className="text-xs font-semibold text-[#c2410c]">{msg.text}</span>}
    </span>
  );
}

export function ReviewDecision({ psychologistId, current }: { psychologistId: string; current: string }) {
  const { pending, msg, run } = useRun();
  const [note, setNote] = useState("");
  return (
    <div className="grid gap-3">
      <label htmlFor="vnote" className="text-sm font-bold">
        Note to the psychologist <span className="font-medium text-ink-2">(required for “needs info” and “reject”)</span>
      </label>
      <textarea id="vnote" className="input-sm min-h-[90px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please upload your current GPC licence certificate." />
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm bg-mint" disabled={pending || current === "approved"} onClick={() => run(() => reviewApplication(psychologistId, "approved", note))}>
          Approve &amp; list
        </button>
        <button className="btn btn-sm bg-sun" disabled={pending} onClick={() => run(() => reviewApplication(psychologistId, "needs_info", note))}>
          Request more information
        </button>
        <button className="btn btn-sm bg-coral" disabled={pending} onClick={() => confirm("Reject this application?") && run(() => reviewApplication(psychologistId, "rejected", note))}>
          Reject
        </button>
      </div>
      <Msg msg={msg} />
    </div>
  );
}

export function AccountStatusControl({ userId, status, self }: { userId: string; status: string; self: boolean }) {
  const { pending, msg, run } = useRun();
  const [reason, setReason] = useState("");
  if (self) return <p className="text-sm text-ink-2">You can&apos;t change the status of your own account.</p>;
  return (
    <div className="grid gap-3">
      <label htmlFor="sreason" className="text-sm font-bold">
        Reason (recorded in the activity log and emailed to the user)
      </label>
      <input id="sreason" className="input-sm" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {status !== "active" && (
          <button className="btn btn-sm bg-mint" disabled={pending} onClick={() => run(() => setAccountStatus(userId, "active", reason))}>
            Reactivate
          </button>
        )}
        {status !== "suspended" && (
          <button className="btn btn-sm bg-sun" disabled={pending} onClick={() => run(() => setAccountStatus(userId, "suspended", reason))}>
            Suspend
          </button>
        )}
        {status !== "deactivated" && (
          <button className="btn btn-sm bg-coral" disabled={pending} onClick={() => confirm("Deactivate this account? The user will be signed out and can't sign in.") && run(() => setAccountStatus(userId, "deactivated", reason))}>
            Deactivate
          </button>
        )}
      </div>
      <Msg msg={msg} />
    </div>
  );
}

export function InviteAdminForm() {
  const { pending, msg, run } = useRun();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => inviteAdmin(name, email), () => (setName(""), setEmail("")));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field">
          <label htmlFor="iname">Full name</label>
          <input id="iname" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="iemail">Work email</label>
          <input id="iemail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <button className="btn btn-primary btn-sm w-fit" disabled={pending}>
        Send invitation
      </button>
      <Msg msg={msg} />
    </form>
  );
}

export function SpecializationRow({ id, name, active, count }: { id: string | null; name: string; active: boolean; count?: number }) {
  const { pending, msg, run } = useRun();
  const [value, setValue] = useState(name);
  return (
    <div className="grid gap-1">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveSpecialization(id, value, id ? active : true), () => !id && setValue(""));
        }}
      >
        <label className="sr-only" htmlFor={`spec-${id ?? "new"}`}>
          Specialisation name
        </label>
        <input id={`spec-${id ?? "new"}`} className="input-sm min-w-[220px] flex-1" value={value} placeholder="New specialisation" onChange={(e) => setValue(e.target.value)} />
        {count != null && <span className="w-24 text-xs text-ink-2">{count} psychologist{count === 1 ? "" : "s"}</span>}
        <button className="btn btn-white btn-sm" disabled={pending || !value.trim() || (id != null && value === name)}>
          {id ? "Rename" : "Add"}
        </button>
        {id && (
          <button type="button" className={`btn btn-sm ${active ? "btn-white" : "bg-mint"}`} disabled={pending} onClick={() => run(() => saveSpecialization(id, name, !active))}>
            {active ? "Hide" : "Show"}
          </button>
        )}
      </form>
      {msg && !msg.ok && <Msg msg={msg} />}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: { cancellationWindowHours: number; maxReschedules: number; pendingReleaseHours: number } }) {
  const { pending, msg, run } = useRun();
  const [s, setS] = useState(settings);
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => savePlatformSettings(s));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="cw">Cancellation window (hours)</label>
          <input id="cw" type="number" min={0} max={168} value={s.cancellationWindowHours} onChange={(e) => setS({ ...s, cancellationWindowHours: Number(e.target.value) })} />
          <p className="text-xs text-ink-2">Clients can reschedule, and cancel without a late flag, until this many hours before a session.</p>
        </div>
        <div className="field">
          <label htmlFor="mr">Reschedules per appointment</label>
          <input id="mr" type="number" min={0} max={10} value={s.maxReschedules} onChange={(e) => setS({ ...s, maxReschedules: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="pr">Release unconfirmed requests (hours before start)</label>
          <input id="pr" type="number" min={0} max={72} value={s.pendingReleaseHours} onChange={(e) => setS({ ...s, pendingReleaseHours: Number(e.target.value) })} />
        </div>
      </div>
      <button className="btn btn-primary btn-sm w-fit" disabled={pending}>
        Save settings
      </button>
      <Msg msg={msg} />
    </form>
  );
}

export function ReportControl({ id, status, resolution }: { id: string; status: "open" | "in_progress" | "resolved"; resolution: string | null }) {
  const { pending, msg, run } = useRun();
  const [s, setS] = useState(status);
  const [text, setText] = useState(resolution ?? "");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`rs-${id}`}>
          Status
        </label>
        <select id={`rs-${id}`} className="input-sm" value={s} onChange={(e) => setS(e.target.value as typeof s)}>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <label className="sr-only" htmlFor={`rr-${id}`}>
          Resolution note
        </label>
        <input id={`rr-${id}`} className="input-sm min-w-[200px] flex-1" placeholder="Resolution / internal note" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-white btn-sm" disabled={pending} onClick={() => run(() => updateReport(id, s, text))}>
          Save
        </button>
      </div>
      <Msg msg={msg} />
    </div>
  );
}
