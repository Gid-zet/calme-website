import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { logActivity } from "@/lib/server/audit";
import { HOME_FOR_ROLE } from "@/lib/server/auth";
import { consumeToken } from "@/lib/server/tokens";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = await consumeToken(token, "verify_email");
  if (!userId) return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));

  const db = await getDb();
  const [user] = await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId)).returning({ role: users.role });
  await logActivity({ actorId: userId, action: "auth.email_verified", entityType: "user", entityId: userId });
  return NextResponse.redirect(new URL(`${HOME_FOR_ROLE[user.role]}?verified=1`, req.url));
}
