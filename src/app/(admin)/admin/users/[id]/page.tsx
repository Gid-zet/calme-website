import { count, eq, or } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { markEmailVerified } from "@/app/admin-actions";
import { AccountStatusControl, ActionButton } from "@/components/admin/AdminControls";
import { Avatar, PageHeader } from "@/components/app/ui";
import { getDb } from "@/db";
import { appointments, users } from "@/db/schema";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { ACTION_LABEL, recentActivity } from "@/lib/server/admin";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "User" };

export default async function AdminUser({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const admin = await requireRole("admin", `/admin/users/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!u) notFound();
  if (u.role === "psychologist") redirect(`/admin/psychologists/${id}`);
  const [byStatus, activity] = await Promise.all([
    db.select({ s: appointments.status, n: count() }).from(appointments).where(or(eq(appointments.clientId, id), eq(appointments.psychologistId, id))).groupBy(appointments.status),
    recentActivity({ actorId: id, limit: 15 }),
  ]);
  const tz = admin.timezone;

  return (
    <div className="grid max-w-4xl gap-6">
      <Link href="/admin/users" className="text-sm font-semibold underline">
        ← All users
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={u.name} fileId={u.avatarFileId} size={52} /> {u.name}
          </span>
        }
        description={`${u.role[0].toUpperCase()}${u.role.slice(1)} · ${u.email}${u.phone ? ` · ${u.phone}` : ""}`}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="!text-xl">Account</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            {[
              ["Status", u.status],
              ["Email", u.emailVerifiedAt ? `Confirmed ${formatDate(u.emailVerifiedAt, tz)}` : "Not confirmed"],
              ["Registered", formatDateTime(u.createdAt, tz)],
              ["Last sign-in", u.lastLoginAt ? formatDateTime(u.lastLoginAt, tz) : "Never"],
              ["Time zone", u.timezone],
              ["Appointments", byStatus.map((b) => `${b.s.replace("_", "-")} ${b.n}`).join(" · ") || "None"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-2">{k}</dt>
                <dd className="text-right font-semibold capitalize">{v}</dd>
              </div>
            ))}
          </dl>
          {!u.emailVerifiedAt && (
            <div className="mt-4">
              <ActionButton action={markEmailVerified.bind(null, u.id)} label="Mark email as verified" confirmText="Only do this if you've confirmed the person controls this inbox. Continue?" />
            </div>
          )}
          {u.role === "client" && (
            <Link href={`/admin/appointments?client=${encodeURIComponent(u.email)}`} className="mt-4 inline-block text-sm font-semibold underline">
              View their appointments
            </Link>
          )}
        </section>
        <section className="panel p-5">
          <h2 className="!text-xl">Manage access</h2>
          {u.statusReason && <p className="mt-1 text-sm text-ink-2">Last reason: {u.statusReason}</p>}
          <div className="mt-3">
            <AccountStatusControl userId={u.id} status={u.status} self={u.id === admin.id} />
          </div>
        </section>
      </div>
      <section className="panel p-5">
        <h2 className="!text-xl">Recent activity</h2>
        {activity.rows.length ? (
          <ul className="mt-3 divide-y divide-ink/10 text-sm">
            {activity.rows.map(({ log }) => (
              <li key={log.id} className="flex justify-between gap-3 py-2">
                <span>{ACTION_LABEL[log.action] ?? log.action}</span>
                <span className="text-ink-2" title={formatDateTime(log.createdAt, tz)}>
                  {relativeTime(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-2">No activity recorded.</p>
        )}
      </section>
      <p className="text-xs text-ink-2">Ordered by most recent. Client messages and appointment notes are private and never shown in the admin console.</p>
    </div>
  );
}
