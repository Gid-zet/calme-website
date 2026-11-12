import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { InviteAdminForm, SettingsForm } from "@/components/admin/AdminControls";
import { PageHeader } from "@/components/app/ui";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { relativeTime } from "@/lib/format";
import { requireRole } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Settings & team" };

export default async function SettingsPage() {
  await requireRole("admin", "/admin/settings");
  const db = await getDb();
  const [settings, team] = await Promise.all([
    getSettings(),
    db.select({ id: users.id, name: users.name, email: users.email, status: users.status, passwordHash: users.passwordHash, lastLoginAt: users.lastLoginAt }).from(users).where(and(eq(users.role, "admin"))),
  ]);
  return (
    <div className="grid max-w-4xl gap-6">
      <PageHeader title="Settings & team" description="Platform-wide booking policy and who can administer CalMe." />
      <section className="panel p-5">
        <h2 className="mb-4 !text-xl">Booking policy</h2>
        <SettingsForm settings={settings} />
      </section>
      <section className="panel p-5">
        <h2 className="!text-xl">Administrators</h2>
        <p className="mb-4 text-sm text-ink-2">Admin accounts can only be created by invitation. Public sign-up never grants admin access.</p>
        <ul className="mb-5 divide-y divide-ink/10 text-sm">
          {team.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <b>{t.name}</b> <span className="text-ink-2">· {t.email}</span>
              </span>
              <span className="text-ink-2">{!t.passwordHash ? "Invitation pending" : t.status !== "active" ? t.status : t.lastLoginAt ? `Active ${relativeTime(t.lastLoginAt)}` : "Never signed in"}</span>
            </li>
          ))}
        </ul>
        <h3 className="mb-2 !text-base">Invite an administrator</h3>
        <InviteAdminForm />
      </section>
    </div>
  );
}
