import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Pagination } from "@/components/app/ui";
import { formatDateTime } from "@/lib/format";
import { ACTION_LABEL, recentActivity } from "@/lib/server/admin";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Activity log" };

const GROUPS = [
  ["", "Everything"],
  ["auth", "Sign-ins & accounts"],
  ["appointment", "Appointments"],
  ["verification", "Verification"],
  ["admin", "Admin actions"],
  ["support", "Support"],
] as const;

const ENTITY_LINK: Record<string, (id: string) => string> = {
  appointment: (id) => `/admin/appointments/${id}`,
  user: (id) => `/admin/users/${id}`,
  psychologist: (id) => `/admin/psychologists/${id}`,
};

export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  const admin = await requireRole("admin", "/admin/activity");
  const sp = await searchParams;
  const group = typeof sp.group === "string" && GROUPS.some(([g]) => g === sp.group) ? sp.group : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageCount } = await recentActivity({ action: group ? `${group}.` : undefined, page, limit: 50 });
  return (
    <>
      <PageHeader title="Activity log" description={`Append-only audit trail · ${total} entries. Metadata never contains passwords, tokens or session notes.`} />
      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filter activity">
        {GROUPS.map(([g, label]) => (
          <Link key={g} href={`/admin/activity${g ? `?group=${g}` : ""}`} aria-current={g === group ? "page" : undefined} className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${g === group ? "bg-lilac" : "bg-white hover:bg-lilac-soft"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-[20px] border-2 border-ink bg-white">
        <table className="tbl min-w-[760px]">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>What</th>
              <th>Details</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ log, actorName, actorRole }) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-xs">{formatDateTime(log.createdAt, admin.timezone)}</td>
                <td>
                  {actorName ?? "System"}
                  {actorRole && <span className="block text-xs text-ink-2">{actorRole}</span>}
                </td>
                <td>{ACTION_LABEL[log.action] ?? log.action}</td>
                <td className="text-xs">
                  {log.entityType && log.entityId && ENTITY_LINK[log.entityType] ? (
                    <Link href={ENTITY_LINK[log.entityType](log.entityId)} className="underline">
                      {log.entityType}
                    </Link>
                  ) : (
                    log.entityType
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && <span className="block font-mono text-ink-2">{JSON.stringify(log.metadata).slice(0, 120)}</span>}
                </td>
                <td className="font-mono text-xs">{log.ip ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} makeHref={(p) => `/admin/activity?${new URLSearchParams({ ...(group ? { group } : {}), page: String(p) })}`} />
    </>
  );
}
