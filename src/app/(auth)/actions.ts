"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  credentials,
  psychologistProfiles,
  psychologistSpecializations,
  specializations,
  users,
  verificationRequests,
} from "@/db/schema";
import { logActivity, notify } from "@/lib/server/audit";
import { safeNext } from "@/lib/server/auth";
import { hashPassword, sha256, verifyPassword } from "@/lib/server/crypto";
import { emails, sendEmail } from "@/lib/server/email";
import { clearRateLimit, rateLimit } from "@/lib/server/rate-limit";
import { appUrl, requestMeta } from "@/lib/server/request";
import { createSession, destroyAllSessions, destroySession, getSessionUser } from "@/lib/server/session";
import { consumeToken, issueToken, sendVerificationEmail } from "@/lib/server/tokens";
import {
  clientSignUpSchema,
  emailSchema,
  fieldErrors,
  passwordSchema,
  psychologistSignUpSchema,
  resetPasswordSchema,
  signInSchema,
  type FormState,
} from "@/lib/validation";

const TOO_MANY = (s: number) => `Too many attempts. Please wait ${Math.ceil(s / 60)} minute${s > 60 ? "s" : ""} and try again.`;

/** Echo safe, non-secret fields back so the form keeps what the person typed. */
function keep(form: FormData, ...names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, String(form.get(n) ?? "")]));
}

async function emailTaken(email: string) {
  const db = await getDb();
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  return Boolean(row);
}

/* ───────────── Sign up ───────────── */

export async function signUpClient(_: FormState, form: FormData): Promise<FormState> {
  const fields = ["name", "email", "phone", "preferredLanguage", "pronouns"];
  const { ip } = await requestMeta();
  const limit = await rateLimit(`signup:ip:${ip}`, 10, 3600);
  if (!limit.ok) return { message: TOO_MANY(limit.retryAfterSeconds), values: keep(form, ...fields) };

  const parsed = clientSignUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: keep(form, ...fields) };
  const d = parsed.data;
  if (await emailTaken(d.email)) {
    return { errors: { email: "An account with this email already exists. Sign in or reset your password." }, values: keep(form, ...fields) };
  }

  const db = await getDb();
  const [user] = await db
    .insert(users)
    .values({
      email: d.email,
      name: d.name,
      phone: d.phone ?? null,
      preferredLanguage: d.preferredLanguage ?? null,
      pronouns: d.pronouns ?? null,
      role: "client", // fixed server-side: the form can't choose a role
      passwordHash: await hashPassword(d.password),
      timezone: d.timezone,
      termsAcceptedAt: new Date(),
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  await sendVerificationEmail(user);
  await logActivity({ actorId: user.id, action: "auth.signup", entityType: "user", entityId: user.id, metadata: { role: "client" } });
  await createSession(user.id);
  redirect("/dashboard?welcome=1");
}

export async function signUpPsychologist(_: FormState, form: FormData): Promise<FormState> {
  const fields = ["name", "email", "phone", "title", "licenseCategory", "licenseNumber", "licenseExpiresOn", "yearsExperience", "bio"];
  const { ip } = await requestMeta();
  const limit = await rateLimit(`signup:ip:${ip}`, 10, 3600);
  if (!limit.ok) return { message: TOO_MANY(limit.retryAfterSeconds), values: keep(form, ...fields) };

  let credentialRows: unknown = [];
  try {
    credentialRows = JSON.parse(String(form.get("credentials") ?? "[]"));
  } catch {
    credentialRows = [];
  }
  const parsed = psychologistSignUpSchema.safeParse({
    ...Object.fromEntries(form),
    specializationIds: form.getAll("specializationIds"),
    languages: form.getAll("languages"),
    credentials: credentialRows,
  });
  const values = { ...keep(form, ...fields), credentials: String(form.get("credentials") ?? "[]"), specializationIds: form.getAll("specializationIds").join(","), languages: form.getAll("languages").join(",") };
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const d = parsed.data;
  if (await emailTaken(d.email)) {
    return { errors: { email: "An account with this email already exists. Sign in or reset your password." }, values };
  }

  const db = await getDb();
  const validSpecs = await db
    .select({ id: specializations.id })
    .from(specializations)
    .where(and(inArray(specializations.id, d.specializationIds), eq(specializations.active, true)));
  if (!validSpecs.length) return { errors: { specializationIds: "Choose at least one area of specialisation." }, values };

  const passwordHash = await hashPassword(d.password);
  const user = await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({ email: d.email, name: d.name, phone: d.phone, role: "psychologist", passwordHash, timezone: d.timezone, termsAcceptedAt: new Date() })
      .returning({ id: users.id, name: users.name, email: users.email });
    await tx.insert(psychologistProfiles).values({
      userId: u.id,
      title: d.title,
      bio: d.bio,
      yearsExperience: d.yearsExperience,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiresOn: d.licenseExpiresOn ?? null,
      languages: d.languages,
      timezone: d.timezone,
      verificationStatus: "pending",
    });
    await tx.insert(psychologistSpecializations).values(validSpecs.map((s) => ({ psychologistId: u.id, specializationId: s.id })));
    await tx.insert(credentials).values(
      d.credentials.map((c) => ({ psychologistId: u.id, kind: c.kind, title: c.title, institution: c.institution ?? null, year: c.year ?? null })),
    );
    await tx.insert(verificationRequests).values({ psychologistId: u.id, status: "pending" });
    return u;
  });

  await sendVerificationEmail(user);
  await logActivity({ actorId: user.id, action: "auth.signup", entityType: "user", entityId: user.id, metadata: { role: "psychologist" } });
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), eq(users.status, "active")));
  for (const a of admins) {
    await notify(a.id, { type: "verification.submitted", title: `New psychologist application: ${user.name}`, link: `/admin/psychologists/${user.id}` });
  }
  await createSession(user.id);
  redirect("/practice?welcome=1");
}

/* ───────────── Sign in / out ───────────── */

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, "email");
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const { email, password } = parsed.data;

  const { ip } = await requestMeta();
  const byIp = await rateLimit(`login:ip:${ip}`, 30, 900);
  const byEmail = await rateLimit(`login:email:${sha256(email)}`, 8, 900);
  if (!byIp.ok || !byEmail.ok) {
    await logActivity({ actorId: null, action: "auth.login_throttled", metadata: { emailHash: sha256(email).slice(0, 12) } });
    return { message: TOO_MANY(Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds)), values };
  }

  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) {
    await logActivity({ actorId: user?.id ?? null, action: "auth.login_failed", entityType: "user", entityId: user?.id });
    return { message: "That email and password combination doesn't match our records.", values };
  }
  if (user.status !== "active") {
    return {
      message:
        user.status === "suspended"
          ? "This account is suspended. Please contact support@cal-me.org if you think this is a mistake."
          : "This account has been deactivated. Please contact support@cal-me.org to reactivate it.",
      values,
    };
  }

  await clearRateLimit(`login:email:${sha256(email)}`);
  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logActivity({ actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id });
  redirect(safeNext(form.get("next"), user.role));
}

export async function signOut() {
  const user = await getSessionUser();
  await destroySession();
  if (user) await logActivity({ actorId: user.id, action: "auth.logout", entityType: "user", entityId: user.id });
  redirect("/sign-in?signedOut=1");
}

/* ───────────── Password reset ───────────── */

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { errors: { email: "Enter a valid email address." }, values: keep(form, "email") };
  const email = parsed.data;
  const generic: FormState = { ok: true, message: "If an account exists for that email, we've sent a link to reset the password. It expires in 1 hour." };

  const { ip } = await requestMeta();
  const byIp = await rateLimit(`reset:ip:${ip}`, 10, 900);
  const byEmail = await rateLimit(`reset:email:${sha256(email)}`, 3, 3600);
  if (!byIp.ok) return { message: TOO_MANY(byIp.retryAfterSeconds), values: { email } };
  if (!byEmail.ok) return generic; // don't reveal anything; just stop sending

  const db = await getDb();
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, status: users.status }).from(users).where(eq(users.email, email)).limit(1);
  if (user && user.status !== "deactivated") {
    const token = await issueToken(user.id, "reset_password", 1);
    const m = emails.reset(user.name, `${await appUrl()}/reset-password?token=${token}`);
    await sendEmail(user.email, m.subject, m.html, m.text);
    await logActivity({ actorId: user.id, action: "auth.password_reset_requested", entityType: "user", entityId: user.id });
  }
  return generic;
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const userId = await consumeToken(parsed.data.token, "reset_password");
  if (!userId) return { message: "This reset link is invalid or has expired. Please request a new one." };

  const db = await getDb();
  // Completing a reset proves control of the inbox, so it also verifies the email.
  const [u] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ emailVerifiedAt: users.emailVerifiedAt });
  if (!u.emailVerifiedAt) await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  await destroyAllSessions(userId); // sign out every device
  await logActivity({ actorId: userId, action: "auth.password_reset", entityType: "user", entityId: userId });
  redirect("/sign-in?reset=1");
}

/* ───────────── Email verification ───────────── */

export async function resendVerification(): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (user.emailVerified) return { ok: true, message: "Your email is already confirmed." };
  const limit = await rateLimit(`verify:user:${user.id}`, 3, 3600);
  if (!limit.ok) return { message: TOO_MANY(limit.retryAfterSeconds) };
  await sendVerificationEmail(user);
  return { ok: true, message: `We've sent a new confirmation link to ${user.email}.` };
}

/* ───────────── Admin invitations ───────────── */

export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { errors: { password: password.error.issues[0].message } };
  if (form.get("password") !== form.get("confirmPassword")) return { errors: { confirmPassword: "Passwords don't match." } };

  const userId = await consumeToken(String(form.get("token") ?? ""), "admin_invite");
  if (!userId) return { message: "This invitation is invalid or has expired. Ask an administrator to send a new one." };
  const db = await getDb();
  const [u] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(password.data), emailVerifiedAt: new Date(), status: "active", updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.role, "admin")))
    .returning({ id: users.id });
  if (!u) return { message: "This invitation is no longer valid." };
  await logActivity({ actorId: u.id, action: "admin.invite_accepted", entityType: "user", entityId: u.id });
  await createSession(u.id);
  redirect("/admin");
}
