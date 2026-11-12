"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { notifications, sessions, users } from "@/db/schema";
import { logActivity } from "@/lib/server/audit";
import { requireUser } from "@/lib/server/auth";
import { hashPassword, sha256, verifyPassword } from "@/lib/server/crypto";
import { rateLimit } from "@/lib/server/rate-limit";
import { SESSION_COOKIE } from "@/lib/server/session";
import { fieldErrors, passwordSchema, phoneSchema, type FormState } from "@/lib/validation";
import { cookies } from "next/headers";
import { z } from "zod";

export async function markNotificationsRead(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = formData.get("id");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt), typeof id === "string" && id ? eq(notifications.id, id) : undefined));
  revalidatePath("/", "layout");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z.preprocess((v) => (v === "" ? undefined : v), phoneSchema.optional()),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone."),
  preferredLanguage: z.string().trim().max(40).optional(),
});

export async function updateAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const db = await getDb();
  await db
    .update(users)
    .set({ name: parsed.data.name, phone: parsed.data.phone ?? null, timezone: parsed.data.timezone, preferredLanguage: parsed.data.preferredLanguage || null, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Your details have been saved." };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const limit = await rateLimit(`pwchange:${user.id}`, 5, 900);
  if (!limit.ok) return { message: "Too many attempts. Please try again later." };
  const next = passwordSchema.safeParse(form.get("password"));
  if (!next.success) return { errors: { password: next.error.issues[0].message } };
  if (form.get("password") !== form.get("confirmPassword")) return { errors: { confirmPassword: "Passwords don't match." } };
  const db = await getDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!(await verifyPassword(String(form.get("currentPassword") ?? ""), row?.hash))) return { errors: { currentPassword: "Your current password is incorrect." } };
  await db.update(users).set({ passwordHash: await hashPassword(next.data), updatedAt: new Date() }).where(eq(users.id, user.id));
  // Keep this device signed in; sign out every other session.
  const current = (await cookies()).get(SESSION_COOKIE)?.value;
  const all = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id));
  for (const s of all) if (!current || s.id !== sha256(current)) await db.delete(sessions).where(eq(sessions.id, s.id));
  await logActivity({ actorId: user.id, action: "auth.password_changed", entityType: "user", entityId: user.id });
  return { ok: true, message: "Password updated. Other devices have been signed out." };
}
