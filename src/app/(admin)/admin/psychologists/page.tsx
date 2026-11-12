import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EmptyState, PageHeader, VerificationBadge } from "@/components/app/ui";
import { getDb } from "@/db";
import { psychologistProfiles, users } from "@/db/schema";
import { formatDate, relativeTime } from "@/lib/format";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Psychologists" };

const TABS = {
  queue: { label: "Applications", statuses: ["pending", "needs_info"] as const },
  verified: { label: "Verified", statuses: ["approved"] as const },
  rejected: { label: "Rejected", statuses: ["rejected"] as const },
  all: { label: "All", statuses: null },
} as const;

export default async function AdminPsychologists({ searchParams }: PageProps<"/admin/psychologists">) {
  const admin = await requireRole("admin", "/admin/psychologists");
  const { tab } = await searchParams;
  const key = (typeof tab === "string" && tab in TABS ? tab : "queue") as keyof typeof TABS;
  const t = TABS[key];
  const db = await getDb();
  const conds: SQL[] = [];
  if (t.statuses) conds.push(inArray(psychologistProfiles.verificationStatus, [...t.statuses]));
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      avatarFileId: users.avatarFileId,
      createdAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      title: psychologistProfiles.title,
      licenseNumber: psychologistProfiles.licenseNumber,
      licenseCategory: psychologistProfiles.licenseCategory,
      licenseExpiresOn: psychologistProfiles.licenseExpiresOn,
      verification: psychologistProfiles.verificationStatus,
      years: psychologistProfiles.yearsExperience,
    })
    .from(psychologistProfiles)
    .innerJoin(users, eq(users.id, psychologistProfiles.userId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(key === "queue" ? asc(users.createdAt) : desc(users.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader title="Psychologists" description="Review applications against the GPC register, and manage verified practitioners." />
      <nav role="tablist" className="mb-5 flex flex-wrap gap-1 rounded-2xl border-2 border-ink bg-white p-1" aria-label="Filter">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
          <Link key={k} role="tab" aria-selected={k === key} href={`/admin/psychologists?tab=${k}`} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${k === key ? "bg-lilac" : "hover:bg-lilac-soft"}`}>
            {TABS[k].label}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <div className="overflow-x-auto rounded-[20px] border-2 border-ink bg-white">
          <table className="tbl min-w-[760px]">
            <thead>
              <tr>
                <th>Psychologist</th>
                <th>Registration</th>
                <th>Experience</th>
                <th>Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/psychologists/${r.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      <Avatar name={r.name} fileId={r.avatarFileId} size={34} />
                      <span>
                        {r.name}
                        <span className="block text-xs font-normal text-ink-2">{r.title}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="block font-mono text-xs">{r.licenseNumber}</span>
                    <span className="text-xs text-ink-2">
                      {r.licenseCategory}
                      {r.licenseExpiresOn ? ` · until ${formatDate(r.licenseExpiresOn, admin.timezone, { weekday: undefined })}` : ""}
                    </span>
                  </td>
                  <td>{r.years} yrs</td>
                  <td title={formatDate(r.createdAt, admin.timezone)}>{relativeTime(r.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <VerificationBadge status={r.verification} />
                      {r.status !== "active" && <span className="badge bg-coral-soft capitalize">{r.status}</span>}
                      {!r.emailVerifiedAt && <span className="badge bg-[#eee]">Email unconfirmed</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="🩺" title={key === "queue" ? "No applications waiting" : "Nobody here yet"} />
      )}
    </>
  );
}
