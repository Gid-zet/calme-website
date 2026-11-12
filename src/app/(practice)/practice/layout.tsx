import { Suspense } from "react";
import { SidebarShell, type SideGroup } from "@/components/app/Shells";
import { PageSkeleton, VerificationBadge } from "@/components/app/ui";
import { getDb } from "@/db";
import { psychologistProfiles } from "@/db/schema";
import { requireRole } from "@/lib/server/auth";
import { unreadCount } from "@/lib/server/notifications";
import { pendingCount } from "@/lib/server/practice";
import { eq } from "drizzle-orm";

async function PracticeShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole("psychologist", "/practice");
  const db = await getDb();
  const [[profile], unread, pending] = await Promise.all([
    db.select({ v: psychologistProfiles.verificationStatus, accepting: psychologistProfiles.acceptingClients }).from(psychologistProfiles).where(eq(psychologistProfiles.userId, user.id)),
    unreadCount(user.id),
    pendingCount(user.id),
  ]);
  const groups: SideGroup[] = [
    {
      items: [
        { href: "/practice", label: "Overview", icon: "home", exact: true },
        { href: "/practice/schedule", label: "Schedule", icon: "calendar" },
        { href: "/practice/appointments", label: "Appointments", icon: "inbox", badge: pending },
      ],
    },
    {
      title: "Practice setup",
      items: [
        { href: "/practice/availability", label: "Availability", icon: "clock" },
        { href: "/practice/services", label: "Services & fees", icon: "tag" },
        { href: "/practice/profile", label: "Public profile", icon: "user" },
        { href: "/practice/verification", label: "Verification", icon: "shield" },
      ],
    },
  ];
  return (
    <SidebarShell
      variant="practice"
      groups={groups}
      user={user}
      unread={unread}
      topRight={
        <div className="flex items-center gap-2 text-sm">
          <VerificationBadge status={profile.v} />
          <span className="badge" style={{ background: profile.accepting ? "var(--mint-soft)" : "#eee" }}>
            {profile.accepting ? "Accepting new clients" : "Not accepting bookings"}
          </span>
        </div>
      }
    >
      {children}
    </SidebarShell>
  );
}

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1200px] p-8">
          <PageSkeleton />
        </div>
      }
    >
      <PracticeShell>{children}</PracticeShell>
    </Suspense>
  );
}

// Private, per-user pages: always rendered at request time behind the session check.
export const instant = false;
