import Link from "next/link";
import { markNotificationsRead } from "@/app/account-actions";
import { formatDateTime, relativeTime } from "@/lib/format";
import { listNotifications } from "@/lib/server/notifications";
import type { SessionUser } from "@/lib/server/session";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccountForms } from "./AccountForms";
import { EmptyState, PageHeader } from "./ui";

export async function NotificationsView({ user }: { user: SessionUser }) {
  const items = await listNotifications(user.id, 100);
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          unread ? (
            <form action={markNotificationsRead}>
              <button className="btn btn-white btn-sm">Mark all as read</button>
            </form>
          ) : undefined
        }
      />
      {items.length ? (
        <ul className="panel divide-y divide-ink/10">
          {items.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 px-4 py-4 ${n.readAt ? "" : "bg-sun-soft/40"}`}>
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-coral"}`} aria-label={n.readAt ? undefined : "Unread"} />
              <div className="min-w-0 flex-1">
                <b className="block">{n.title}</b>
                {n.body && <p className="text-sm text-ink-2">{n.body}</p>}
                <span className="text-xs text-ink-2" title={formatDateTime(n.createdAt, user.timezone)}>
                  {relativeTime(n.createdAt)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {n.link && (
                  <Link href={n.link} className="btn btn-white btn-sm">
                    Open
                  </Link>
                )}
                {!n.readAt && (
                  <form action={markNotificationsRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="text-xs font-semibold underline">Mark read</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🔔" title="No notifications yet" body="Booking confirmations, changes and reminders will appear here." />
      )}
    </>
  );
}

export async function AccountView({ user }: { user: SessionUser }) {
  const db = await getDb();
  const [row] = await db.select({ phone: users.phone, preferredLanguage: users.preferredLanguage, createdAt: users.createdAt }).from(users).where(eq(users.id, user.id));
  return (
    <>
      <PageHeader title="Account & security" description={`Signed in as ${user.email} · member since ${formatDateTime(row.createdAt, user.timezone, { hour: undefined, minute: undefined, weekday: undefined, year: "numeric" })}`} />
      <AccountForms
        role={user.role}
        defaults={{ name: user.name, phone: row.phone ?? "", timezone: user.timezone, preferredLanguage: row.preferredLanguage ?? "" }}
        emailVerified={user.emailVerified}
      />
    </>
  );
}
