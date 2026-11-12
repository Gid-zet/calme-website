import "server-only";
import { getDb } from "@/db";
import { platformSettings } from "@/db/schema";

export const DEFAULT_SETTINGS = {
  /** Clients can reschedule, and cancel without it counting as "late", up to this many hours before a session. */
  cancellationWindowHours: 24,
  /** How many times a client may move the same appointment. */
  maxReschedules: 2,
  /** Booking requests still pending this many hours before the start are released automatically. */
  pendingReleaseHours: 2,
};

/** What a client may still do with an appointment right now, under the platform policy. Mirrors the checks in booking.ts. */
export function clientChangeRules(
  a: { status: string; startsAt: Date; rescheduleCount: number; serviceId: string | null },
  s: PlatformSettings,
  now = Date.now(),
) {
  const active = (a.status === "pending" || a.status === "confirmed") && a.startsAt.getTime() > now;
  const inWindow = (a.startsAt.getTime() - now) / 3600_000 < s.cancellationWindowHours;
  const rescheduleBlockedReason = !active
    ? undefined
    : inWindow
      ? `Rescheduling closes ${s.cancellationWindowHours} hours before the session. You can still cancel, or contact your psychologist.`
      : a.rescheduleCount >= s.maxReschedules
        ? `You've already rescheduled this appointment ${s.maxReschedules} times.`
        : !a.serviceId
          ? "This service is no longer offered, so it can't be moved."
          : undefined;
  return { active, inWindow, rescheduleBlockedReason };
}

export function policyText(s: PlatformSettings) {
  return `You can reschedule (up to ${s.maxReschedules} times) or cancel without penalty until ${s.cancellationWindowHours} hours before your session. Cancellations after that are recorded as late cancellations.`;
}
export type PlatformSettings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<PlatformSettings> {
  const db = await getDb();
  const rows = await db.select().from(platformSettings);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  return merged as PlatformSettings;
}
