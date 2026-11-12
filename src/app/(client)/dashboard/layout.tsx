import { Suspense } from "react";
import { ClientShellHeader } from "@/components/app/Shells";
import { PageSkeleton } from "@/components/app/ui";
import { requireRole } from "@/lib/server/auth";
import { unreadCount } from "@/lib/server/notifications";

async function ClientShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole("client", "/dashboard");
  const unread = await unreadCount(user.id);
  return (
    <>
      <ClientShellHeader user={user} unread={unread} />
      <main className="wrap py-10">{children}</main>
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <Suspense
        fallback={
          <div className="wrap py-10">
            <PageSkeleton />
          </div>
        }
      >
        <ClientShell>{children}</ClientShell>
      </Suspense>
    </div>
  );
}

// Private, per-user pages: always rendered at request time behind the session check.
export const instant = false;
