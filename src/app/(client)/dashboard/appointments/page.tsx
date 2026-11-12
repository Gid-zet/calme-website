import type { Metadata } from "next";
import Link from "next/link";
import { AppointmentItem } from "@/components/app/AppointmentItem";
import { EmptyState, PageHeader } from "@/components/app/ui";
import { listForClient } from "@/lib/server/appointments-query";
import { requireRole } from "@/lib/server/auth";
import { releaseStaleRequests } from "@/lib/server/booking";

export const metadata: Metadata = { title: "My appointments" };

export default async function ClientAppointments({ searchParams }: PageProps<"/dashboard/appointments">) {
  const user = await requireRole("client", "/dashboard/appointments");
  const { tab } = await searchParams;
  const scope = tab === "past" ? "past" : "upcoming";
  await releaseStaleRequests();
  const rows = await listForClient(user.id, scope, 100);

  return (
    <>
      <PageHeader title="My appointments" description="Track requests, see confirmed sessions, and manage changes." actions={<Link href="/psychologists" className="btn btn-primary btn-sm">Book a session</Link>} />
      <div role="tablist" aria-label="Appointments" className="mb-5 inline-flex rounded-full border-2 border-ink bg-white p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <Link key={t} role="tab" aria-selected={scope === t} href={`/dashboard/appointments?tab=${t}`} className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${scope === t ? "bg-sun" : ""}`}>
            {t === "past" ? "History" : "Upcoming"}
          </Link>
        ))}
      </div>
      {rows.length ? (
        <ul className="grid gap-2">
          {rows.map((a) => (
            <AppointmentItem key={a.id} a={a} tz={user.timezone} perspective="client" />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={scope === "upcoming" ? "🗓️" : "📖"}
          title={scope === "upcoming" ? "Nothing booked yet" : "No past appointments"}
          body={scope === "upcoming" ? "Find a psychologist who fits you and pick a time that works." : "Completed, cancelled and declined appointments will appear here."}
          action={scope === "upcoming" ? <Link href="/psychologists" className="btn btn-primary btn-sm">Find a psychologist</Link> : undefined}
        />
      )}
    </>
  );
}
