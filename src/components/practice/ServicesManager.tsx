"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteService, saveService } from "@/app/practice-actions";
import { formatMoney, MODE_LABEL } from "@/lib/format";
import type { FormState } from "@/lib/validation";
import { FieldError } from "../forms/Field";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceMinor: number; currency: string; modes: ("online" | "in_person")[]; active: boolean };

function ServiceForm({ service, onDone }: { service?: Service; onDone: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [pending, start] = useTransition();
  const e = state.errors ?? {};
  return (
    <form
      className="grid gap-3 rounded-2xl border-2 border-ink bg-cream p-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        const f = new FormData(ev.currentTarget);
        start(async () => {
          const r = await saveService(service?.id ?? null, {
            name: f.get("name"),
            description: f.get("description"),
            durationMinutes: f.get("durationMinutes"),
            price: f.get("price"),
            modes: f.getAll("modes"),
            active: f.get("active") === "on",
          });
          setState(r);
          if (r.ok) {
            router.refresh();
            onDone();
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="field">
          <label htmlFor={`n-${service?.id ?? "new"}`}>Service name</label>
          <input id={`n-${service?.id ?? "new"}`} name="name" required maxLength={80} defaultValue={service?.name} placeholder="e.g. Individual therapy" />
          <FieldError error={e.name} />
        </div>
        <div className="field">
          <label htmlFor={`d-${service?.id ?? "new"}`}>Length (min)</label>
          <input id={`d-${service?.id ?? "new"}`} name="durationMinutes" type="number" min={15} max={240} step={5} required defaultValue={service?.durationMinutes ?? 50} />
          <FieldError error={e.durationMinutes} />
        </div>
        <div className="field">
          <label htmlFor={`p-${service?.id ?? "new"}`}>Fee (GH₵)</label>
          <input id={`p-${service?.id ?? "new"}`} name="price" type="number" min={0} step={10} required defaultValue={service ? service.priceMinor / 100 : 300} />
          <FieldError error={e.price} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`desc-${service?.id ?? "new"}`}>
          Short description <span className="font-medium text-ink-2">(optional)</span>
        </label>
        <input id={`desc-${service?.id ?? "new"}`} name="description" maxLength={500} defaultValue={service?.description ?? ""} placeholder="Who it's for and what to expect" />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">Consultation methods</legend>
        <div className="flex flex-wrap gap-2">
          {(["online", "in_person"] as const).map((m) => (
            <label key={m} className="chip-check">
              <input type="checkbox" name="modes" value={m} defaultChecked={service ? service.modes.includes(m) : m === "online"} />
              <span>{MODE_LABEL[m]}</span>
            </label>
          ))}
        </div>
        <FieldError error={e.modes} />
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-4 w-4 accent-[var(--blue)]" /> Bookable by clients
      </label>
      {state.message && !state.ok && <p role="alert" className="text-sm font-semibold text-[#c2410c]">{state.message}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Saving…" : service ? "Save service" : "Add service"}
        </button>
        <button type="button" className="btn btn-white btn-sm" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ServicesManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(services.length ? null : "new");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      {msg && (
        <p role="status" className="rounded-xl border-2 border-ink bg-mint-soft px-3 py-2 text-sm font-semibold">
          {msg}
        </p>
      )}
      <ul className="grid gap-3">
        {services.map((s) =>
          editing === s.id ? (
            <li key={s.id}>
              <ServiceForm service={s} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={s.id} className={`panel flex flex-wrap items-center justify-between gap-3 p-4 ${s.active ? "" : "opacity-60"}`}>
              <div>
                <b className="font-display text-lg">{s.name}</b> {!s.active && <span className="badge ml-1 bg-[#eee]">Hidden</span>}
                <span className="block text-sm text-ink-2">
                  {s.durationMinutes} min · {s.modes.map((m) => MODE_LABEL[m]).join(" or ")} · {formatMoney(s.priceMinor, s.currency)}
                </span>
                {s.description && <span className="block text-sm text-ink-2">{s.description}</span>}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-white btn-sm" onClick={() => setEditing(s.id)}>
                  Edit
                </button>
                <button
                  className="btn btn-white btn-sm"
                  disabled={pending}
                  onClick={() =>
                    confirm(`Delete "${s.name}"?`) &&
                    start(async () => {
                      const r = await deleteService(s.id);
                      setMsg(r.ok ? (r.message ?? "Deleted.") : r.error);
                      router.refresh();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <ServiceForm onDone={() => setEditing(null)} />
      ) : (
        <button className="btn btn-primary btn-sm w-fit" onClick={() => setEditing("new")}>
          + Add a service
        </button>
      )}
    </div>
  );
}
