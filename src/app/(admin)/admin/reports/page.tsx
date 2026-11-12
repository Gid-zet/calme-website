import { desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { ReportControl } from "@/components/admin/AdminControls";
import { EmptyState, PageHeader } from "@/components/app/ui";
import { getDb } from "@/db";
import { supportReports, users } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Support reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const admin = await requireRole("admin", "/admin/reports");
  const { show } = await searchParams;
  const all = show === "all";
  const db = await getDb();
  const rows = await db
    .select({ r: supportReports, reporterName: users.name, reporterEmail: users.email, reporterRole: users.role })
    .from(supportReports)
    .innerJoin(users, eq(users.id, supportReports.reporterId))
    .where(all ? undefined : inArray(supportReports.status, ["open", "in_progress"]))
    .orderBy(desc(supportReports.createdAt))
    .limit(200);
  return (
    <>
      <PageHeader
        title="Support reports"
        description="Problems raised by clients and psychologists, including scheduling issues."
        actions={
          <Link href={all ? "/admin/reports" : "/admin/reports?show=all"} className="btn btn-white btn-sm">
            {all ? "Show open only" : "Show all"}
          </Link>
        }
      />
      {rows.length ? (
        <ul className="grid gap-3">
          {rows.map(({ r, reporterName, reporterEmail, reporterRole }) => (
            <li key={r.id} className="panel grid gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="badge mr-2 bg-lilac-soft capitalize">{r.category}</span>
                  <b>{reporterName}</b> <span className="text-ink-2">({reporterRole} · {reporterEmail})</span>
                </span>
                <span className="text-ink-2">{formatDateTime(r.createdAt, admin.timezone)}</span>
              </div>
              <p className="whitespace-pre-line">{r.message}</p>
              {r.appointmentId && (
                <Link href={`/admin/appointments/${r.appointmentId}`} className="text-sm font-semibold underline">
                  Open related appointment
                </Link>
              )}
              <ReportControl id={r.id} status={r.status} resolution={r.resolution} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="✅" title={all ? "No reports yet" : "No open reports"} />
      )}
    </>
  );
}
