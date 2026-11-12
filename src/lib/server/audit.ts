import "server-only";
import { getDb } from "@/db";
import { activityLogs, notifications } from "@/db/schema";
import { requestMeta } from "./request";

/** Append-only audit trail. Never put passwords, tokens or session notes in metadata. */
export async function logActivity(entry: {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  let ip: string | null = null;
  try {
    ip = (await requestMeta()).ip;
  } catch {
    // outside a request (scripts, cron)
  }
  await db.insert(activityLogs).values({ ...entry, ip });
}

export async function notify(userId: string, n: { type: string; title: string; body?: string; link?: string }) {
  const db = await getDb();
  await db.insert(notifications).values({ userId, ...n });
}
