import { count, eq, inArray } from "drizzle-orm";
import { Suspense } from "react";
import { SidebarShell, type SideGroup } from "@/components/app/Shells";
import { PageSkeleton } from "@/components/app/ui";
import { getDb } from "@/db";
import { psychologistProfiles, supportReports } from "@/db/schema";
import { requireRole } from "@/lib/server/auth";
import { unreadCount } from "@/lib/server/notifications";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin", "/admin");
  const db = await getDb();
  const [[apps], [reports], unread] = await Promise.all([
    db.select({ n: count() }).from(psychologistProfiles).where(eq(psychologistProfiles.verificationStatus, "pending")),
    db.select({ n: count() }).from(supportReports).where(inArray(supportReports.status, ["open", "in_progress"])),
    unreadCount(user.id),
  ]);
  const groups: SideGroup[] = [
    { items: [{ href: "/admin", label: "Overview", icon: "chart", exact: true }] },
    {
      title: "People",
      items: [
        { href: "/admin/psychologists", label: "Psychologists", icon: "stethoscope", badge: apps.n },
        { href: "/admin/users", label: "All users", icon: "people" },
      ],
    },
    {
      title: "Operations",
      items: [
        { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
        { href: "/admin/reports", label: "Support reports", icon: "flag", badge: reports.n },
      ],
    },
    {
      title: "Platform",
      items: [
        { href: "/admin/specializations", label: "Specialisations", icon: "tag" },
        { href: "/admin/settings", label: "Settings & team", icon: "settings" },
        { href: "/admin/activity", label: "Activity log", icon: "activity" },
      ],
    },
  ];
  return (
    <SidebarShell variant="admin" groups={groups} user={user} unread={unread} topRight={<span className="text-sm font-semibold text-ink-2">CalMe platform administration</span>}>
      {children}
    </SidebarShell>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1200px] p-8"><PageSkeleton /></div>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

// Private, per-user pages: always rendered at request time behind the session check.
export const instant = false;
