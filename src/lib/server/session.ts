import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";
import { requestMeta } from "./request";

export const SESSION_COOKIE = "calme_session";
const SESSION_DAYS = 14;

/** Creates a session row and sets the httpOnly cookie. Only call from Server Actions / Route Handlers. */
export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const meta = await requestMeta();
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "client" | "psychologist" | "admin";
  status: "active" | "suspended" | "deactivated";
  emailVerified: boolean;
  timezone: string;
  avatarFileId: string | null;
};

/** The signed-in user for this request, or null. Memoised per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  await connection(); // session validity depends on the current time: always evaluate per request
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      timezone: users.timezone,
      avatarFileId: users.avatarFileId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || row.status !== "active") return null;
  const { emailVerifiedAt, ...rest } = row;
  return { ...rest, emailVerified: Boolean(emailVerifiedAt) };
});
