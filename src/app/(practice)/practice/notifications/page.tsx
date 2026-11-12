import type { Metadata } from "next";
import { NotificationsView } from "@/components/app/SharedPages";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  return <NotificationsView user={await requireRole("psychologist", "/practice/notifications")} />;
}
