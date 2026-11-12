import type { Metadata } from "next";
import { AccountView } from "@/components/app/SharedPages";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Account" };

export default async function Page() {
  return <AccountView user={await requireRole("admin", "/admin/account")} />;
}
