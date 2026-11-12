"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { platformSettings, psychologistProfiles, reviews, services, specializations, supportReports, users, verificationRequests } from "@/db/schema";
import { logActivity, notify } from "@/lib/server/audit";
import { requireRole } from "@/lib/server/auth";
import { emails, sendEmail } from "@/lib/server/email";
import { appUrl } from "@/lib/server/request";
import { destroyAllSessions } from "@/lib/server/session";
import { DEFAULT_SETTINGS } from "@/lib/server/settings";
import { issueToken } from "@/lib/server/tokens";
import { emailSchema } from "@/lib/validation";

type Result = { ok: true; message?: string } | { ok: false; error: string };
const uuid = z.uuid();

async function run(fn: () => Promise<string>): Promise<Result> {
  try {
    const message = await fn();
    revalidatePath("/admin", "layout");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    if (e instanceof Error && e.name === "AdminError") return { ok: false, error: e.message };
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
function fail(message: string): never {
  const e = new Error(message);
  e.name = "AdminError";
  throw e;
}

/* ───────────── Psychologist verification ───────────── */

export async function reviewApplication(psychologistId: string, decision: "approved" | "needs_info" | "rejected", note: string) {
  const admin = await requireRole("admin");
  return run(async () => {
    const id = uuid.parse(psychologistId);
    const d = z.enum(["approved", "needs_info", "rejected"]).parse(decision);
    const message = note.trim().slice(0, 1000);
    if (d !== "approved" && !message) fail("Add a note telling the psychologist what's needed or why.");
    const db = await getDb();
    const [p] = await db.select({ name: users.name, email: users.email }).from(users).where(and(eq(users.id, id), eq(users.role, "psychologist")));
    if (!p) fail("Psychologist not found.");
    await db.transaction(async (tx) => {
      await tx
        .update(psychologistProfiles)
        .set({ verificationStatus: d, verifiedAt: d === "approved" ? new Date() : null, updatedAt: new Date() })
        .where(eq(psychologistProfiles.userId, id));
      const [latest] = await tx.select({ id: verificationRequests.id }).from(verificationRequests).where(eq(verificationRequests.psychologistId, id)).orderBy(desc(verificationRequests.createdAt)).limit(1);
      const values = { status: d, reviewerId: admin.id, reviewerNote: message || null, reviewedAt: new Date() };
      if (latest) await tx.update(verificationRequests).set(values).where(eq(verificationRequests.id, latest.id));
      else await tx.insert(verificationRequests).values({ psychologistId: id, ...values });
    });
    await logActivity({ actorId: admin.id, action: `verification.${d}`, entityType: "psychologist", entityId: id });
    const title = d === "approved" ? "You're verified on CalMe 🎉" : d === "needs_info" ? "We need a little more information" : "Update on your CalMe application";
    await notify(id, { type: `verification.${d}`, title, body: message || undefined, link: "/practice/verification" });
    const m = emails.generic(title, [
      d === "approved" ? "Your registration has been verified. Your profile is now listed, and clients can book you during your published hours." : "Our verification team has reviewed your application.",
      ...(message ? [`Note from the team: ${message}`] : []),
    ], { label: "Open your practice", url: `${await appUrl()}/practice/verification` });
    await sendEmail(p.email, m.subject, m.html, m.text);
    return d === "approved" ? `${p.name} is verified and now listed.` : d === "needs_info" ? "Request for information sent." : "Application rejected.";
  });
}

/* ───────────── Accounts ───────────── */

export async function setAccountStatus(userId: string, status: "active" | "suspended" | "deactivated", reason: string) {
  const admin = await requireRole("admin");
  return run(async () => {
    const id = uuid.parse(userId);
    const s = z.enum(["active", "suspended", "deactivated"]).parse(status);
    if (id === admin.id) fail("You can't change your own account status.");
    if (s !== "active" && !reason.trim()) fail("Add a reason. It's recorded in the activity log.");
    const db = await getDb();
    const [u] = await db.update(users).set({ status: s, statusReason: reason.trim().slice(0, 500) || null, updatedAt: new Date() }).where(eq(users.id, id)).returning({ email: users.email, name: users.name });
    if (!u) fail("User not found.");
    if (s !== "active") await destroyAllSessions(id); // sign them out everywhere immediately
    await logActivity({ actorId: admin.id, action: "admin.user_status", entityType: "user", entityId: id, metadata: { status: s, reason: reason.trim() || undefined } });
    const m = emails.generic(
      s === "active" ? "Your CalMe account is active" : s === "suspended" ? "Your CalMe account has been suspended" : "Your CalMe account has been deactivated",
      s === "active" ? ["You can sign in again."] : [`Reason: ${reason.trim()}`, "If you think this is a mistake, reply to this email or contact support@cal-me.org."],
    );
    await sendEmail(u.email, m.subject, m.html, m.text);
    return `${u.name}'s account is now ${s}.`;
  });
}

export async function markEmailVerified(userId: string) {
  const admin = await requireRole("admin");
  return run(async () => {
    const id = uuid.parse(userId);
    const db = await getDb();
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(and(eq(users.id, id), sql`${users.emailVerifiedAt} IS NULL`));
    await logActivity({ actorId: admin.id, action: "admin.email_verified", entityType: "user", entityId: id });
    return "Email marked as verified.";
  });
}

export async function inviteAdmin(name: string, email: string) {
  const admin = await requireRole("admin");
  return run(async () => {
    const n = z.string().trim().min(2, "Enter their full name.").max(100).parse(name);
    const e = emailSchema.parse(email);
    const db = await getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, e)).limit(1);
    if (existing && existing.role !== "admin") fail("That email already belongs to a client or psychologist account. Use a separate work email.");
    if (existing?.passwordHash) fail("That person is already an administrator.");
    const user = existing ?? (await db.insert(users).values({ email: e, name: n, role: "admin", status: "active" }).returning())[0];
    const token = await issueToken(user.id, "admin_invite", 72);
    const m = emails.invite(n, admin.name, `${await appUrl()}/invite?token=${token}`);
    await sendEmail(e, m.subject, m.html, m.text);
    await logActivity({ actorId: admin.id, action: "admin.invite_sent", entityType: "user", entityId: user.id });
    return `Invitation sent to ${e}. It expires in 72 hours.`;
  });
}

/* ───────────── Catalogue & moderation ───────────── */

export async function saveSpecialization(id: string | null, name: string, active: boolean) {
  const admin = await requireRole("admin");
  return run(async () => {
    const n = z.string().trim().min(2, "Enter a name.").max(60).parse(name);
    const slug = n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const db = await getDb();
    try {
      if (id) await db.update(specializations).set({ name: n, slug, active }).where(eq(specializations.id, uuid.parse(id)));
      else await db.insert(specializations).values({ name: n, slug, active });
    } catch {
      fail("A specialisation with that name already exists.");
    }
    updateTag("specializations");
    await logActivity({ actorId: admin.id, action: "admin.specialization", metadata: { name: n, active } });
    return id ? "Specialisation updated." : "Specialisation added.";
  });
}

export async function setServiceActive(serviceId: string, active: boolean) {
  const admin = await requireRole("admin");
  return run(async () => {
    const db = await getDb();
    const [s] = await db.update(services).set({ active }).where(eq(services.id, uuid.parse(serviceId))).returning({ psychologistId: services.psychologistId, name: services.name });
    if (!s) fail("Service not found.");
    await logActivity({ actorId: admin.id, action: "admin.service_status", entityType: "service", entityId: serviceId, metadata: { active } });
    if (!active) await notify(s.psychologistId, { type: "service.hidden", title: `Your service "${s.name}" was hidden by CalMe`, body: "Contact support if you have questions.", link: "/practice/services" });
    return active ? "Service visible again." : "Service hidden from clients.";
  });
}

export async function setReviewHidden(reviewId: string, hidden: boolean) {
  const admin = await requireRole("admin");
  return run(async () => {
    const db = await getDb();
    await db.update(reviews).set({ hidden }).where(eq(reviews.id, uuid.parse(reviewId)));
    await logActivity({ actorId: admin.id, action: "admin.review_visibility", entityType: "review", entityId: reviewId, metadata: { hidden } });
    return hidden ? "Review hidden." : "Review visible.";
  });
}

export async function updateReport(reportId: string, status: "open" | "in_progress" | "resolved", resolution: string) {
  const admin = await requireRole("admin");
  return run(async () => {
    const s = z.enum(["open", "in_progress", "resolved"]).parse(status);
    const db = await getDb();
    const [r] = await db
      .update(supportReports)
      .set({ status: s, resolution: resolution.trim().slice(0, 2000) || null, handledById: admin.id, resolvedAt: s === "resolved" ? new Date() : null })
      .where(eq(supportReports.id, uuid.parse(reportId)))
      .returning({ reporterId: supportReports.reporterId });
    if (!r) fail("Report not found.");
    await logActivity({ actorId: admin.id, action: "support.report_updated", entityType: "support_report", entityId: reportId, metadata: { status: s } });
    if (s === "resolved") await notify(r.reporterId, { type: "support.resolved", title: "Your report has been resolved", body: resolution.trim().slice(0, 300) || undefined });
    return "Report updated.";
  });
}

const settingsSchema = z.object({
  cancellationWindowHours: z.coerce.number().int().min(0).max(168),
  maxReschedules: z.coerce.number().int().min(0).max(10),
  pendingReleaseHours: z.coerce.number().int().min(0).max(72),
});

export async function savePlatformSettings(input: z.input<typeof settingsSchema>) {
  const admin = await requireRole("admin");
  return run(async () => {
    const d = settingsSchema.parse(input);
    const db = await getDb();
    for (const [key, value] of Object.entries(d) as [keyof typeof DEFAULT_SETTINGS, number][]) {
      await db
        .insert(platformSettings)
        .values({ key, value, updatedById: admin.id })
        .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedById: admin.id, updatedAt: new Date() } });
    }
    await logActivity({ actorId: admin.id, action: "admin.settings_updated", metadata: d });
    return "Platform settings saved.";
  });
}
