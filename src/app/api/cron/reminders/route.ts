import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { releaseStaleRequests, sendReminders } from "@/lib/server/booking";

/**
 * Scheduled job: sends 24-hour session reminders and releases stale booking requests.
 * Call every 15–60 minutes with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this header automatically).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [released, reminded] = await Promise.all([releaseStaleRequests(), sendReminders()]);
  return NextResponse.json({ released, reminded });
}
