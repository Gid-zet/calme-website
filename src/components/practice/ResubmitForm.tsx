"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resubmitVerification } from "@/app/practice-actions";

export function ResubmitForm() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <label htmlFor="rnote" className="text-sm font-bold">
        Message for the reviewer (optional)
      </label>
      <textarea id="rnote" className="input-sm min-h-[80px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I've uploaded my 2026 licence certificate." />
      {msg && (
        <p role="status" className="text-sm font-semibold">
          {msg}
        </p>
      )}
      <button
        className="btn btn-primary btn-sm w-fit"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await resubmitVerification(note);
            setMsg(r.ok ? (r.message ?? "Resubmitted.") : r.error);
            if (r.ok) router.refresh();
          })
        }
      >
        {pending ? "Sending…" : "Resubmit for review"}
      </button>
    </div>
  );
}
