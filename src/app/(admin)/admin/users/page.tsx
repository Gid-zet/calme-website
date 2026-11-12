import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EmptyState, PageHeader, Pagination, VerificationBadge } from "@/components/app/ui";
import { formatDate, relativeTime } from "@/lib/format";
import { listUsers } from "@/lib/server/admin";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Users" };

const s = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 80) : undefined);

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireRole("admin", "/admin/users");
  const sp = await searchParams;
  const f = { q: s(sp.q), role: s(sp.role), status: s(sp.status), page: Math.max(1, Number(sp.page) || 1) };
  const { rows, total, pageCount } = await listUsers(f);
  const href = (page: number) => `/admin/users?${new URLSearchParams({ ...(f.q ? { q: f.q } : {}), ...(f.role ? { role: f.role } : {}), ...(f.status ? { status: f.status } : {}), page: String(page) })}`;

  return (
    <>
      <PageHeader title="All users" description={`${total} account${total === 1 ? "" : "s"} match.`} />
      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <div className="field min-w-[220px] flex-1">
          <label htmlFor="q">Search name or email</label>
          <input id="q" name="q" defaultValue={f.q} className="!py-2" />
        </div>
        <div className="field">
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue={f.role ?? ""} className="!py-2">
            <option value="">All roles</option>
            <option value="client">Clients</option>
            <option value="psychologist">Psychologists</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={f.status ?? ""} className="!py-2">
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
            <option value="unverified">Email unconfirmed</option>
          </select>
        </div>
        <button className="btn btn-primary btn-sm">Filter</button>
        {(f.q || f.role || f.status) && (
          <Link href="/admin/users" className="btn btn-white btn-sm">
            Reset
          </Link>
        )}
      </form>
      {rows.length ? (
        <div className="overflow-x-auto rounded-[20px] border-2 border-ink bg-white">
          <table className="tbl min-w-[760px]">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={u.role === "psychologist" ? `/admin/psychologists/${u.id}` : `/admin/users/${u.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      <Avatar name={u.name} fileId={u.avatarFileId} size={32} />
                      <span>
                        {u.name}
                        <span className="block text-xs font-normal text-ink-2">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="capitalize">
                    {u.role}
                    {u.verification && (
                      <span className="ml-1">
                        <VerificationBadge status={u.verification} />
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge capitalize" style={{ background: u.status === "active" ? "var(--mint-soft)" : "var(--coral-soft)" }}>
                      {u.status}
                    </span>
                    {!u.emailVerifiedAt && <span className="badge ml-1 bg-[#eee]">unconfirmed</span>}
                  </td>
                  <td>{formatDate(u.createdAt, admin.timezone)}</td>
                  <td>{u.lastLoginAt ? relativeTime(u.lastLoginAt) : <span className="text-ink-2">Never</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="🔎" title="No users match these filters" />
      )}
      <Pagination page={f.page} pageCount={pageCount} makeHref={href} />
    </>
  );
}
