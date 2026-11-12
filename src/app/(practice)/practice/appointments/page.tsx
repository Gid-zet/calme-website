import type { Metadata } from "next";
import Link from "next/link";
import { AppointmentItem } from "@/components/app/AppointmentItem";
import { EmptyState, PageHeader } from "@/components/app/ui";
import { listForPsychologist } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";
import { releaseStaleRequests } from "@/lib/server/booking";

export const metadata: Metadata = { title: "Appointments" };

const TABS = {
  requests: { label: "Requests", statuses: ["pending"] as const, time: "future" },
  upcoming: { label: "Upcoming", statuses: ["confirmed"] as const, time: "future" },
  outcome: { label: "Needs outcome", statuses: ["confirmed"] as const, time: "past" },
  past: { label: "Completed", statuses: ["completed", "no_show"] as const, time: "any" },
  cancelled: { label: "Cancelled", statuses: ["cancelled", "declined"] as const, time: "any" },
} as const;

export default async function PracticeAppointments({ searchParams }: PageProps<"/practice/appointments">) {
  const me = await requireRole("psychologist", "/practice/appointments");
  const { tab } = await searchParams;
  const key = (typeof tab === "string" && tab in TABS ? tab : "upcoming") as keyof typeof TABS;
  const t = TABS[key];
  await releaseStaleRequests();
  const now = new Date();
  const rows = await listForPsychologist(me.id, {
    statuses: [...t.statuses],
    from: t.time === "future" ? now : undefined,
    to: t.time === "past" ? now : undefined,
    order: t.time === "future" ? "asc" : "desc",
  });

  return (
    <>
      <PageHeader title="Appointments" description="Requests, upcoming sessions and your history, all in one place." />
      <nav role="tablist" aria-label="Appointment filters" className="mb-5 flex flex-wrap gap-1 rounded-2xl border-2 border-ink bg-white p-1">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
          <Link key={k} role="tab" aria-selected={key === k} href={`/practice/appointments?tab=${k}`} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${key === k ? "bg-mint" : "hover:bg-mint-soft"}`}>
            {TABS[k].label}
          </Link>
        ))}
      </nav>
      {key === "outcome" && rows.length > 0 && <p className="mb-3 text-sm text-ink-2">These sessions have started. Mark each as completed or no-show to keep your records accurate.</p>}
      {rows.length ? (
        <ul className="grid gap-2">
          {rows.map((a) => (
            <AppointmentItem key={a.id} a={a} tz={me.timezone} perspective="psychologist" />
          ))}
        </ul>
      ) : (
        <EmptyState icon="📋" title={`No ${t.label.toLowerCase()} appointments`} />
      )}
    </>
  );
}
