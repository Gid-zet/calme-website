import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/db";
import { authTokens, users } from "@/db/schema";
import { randomToken, sha256 } from "./crypto";
import { emails, sendEmail } from "./email";
import { appUrl } from "./request";

type TokenType = "verify_email" | "reset_password" | "admin_invite";

/** Issues a single-use token (only its hash is stored) and invalidates older ones of the same type. */
export async function issueToken(userId: string, type: TokenType, hours: number): Promise<string> {
  const db = await getDb();
  const token = randomToken();
  await db.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));
    await tx.insert(authTokens).values({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + hours * 3600_000) });
  });
  return token;
}

/** Marks a valid token used and returns its user id, or null if it's unknown, used or expired. */
export async function consumeToken(token: string, type: TokenType): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.tokenHash, sha256(token)), eq(authTokens.type, type), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

/** Looks a token up without consuming it (to render the reset / invite form). */
export async function peekToken(token: string, type: TokenType) {
  await connection(); // expiry depends on the current time: always evaluate per request
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const [row] = await db
    .select({ userId: authTokens.userId, name: users.name, email: users.email })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .where(and(eq(authTokens.tokenHash, sha256(token)), eq(authTokens.type, type), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function sendVerificationEmail(user: { id: string; name: string; email: string }) {
  const token = await issueToken(user.id, "verify_email", 24);
  const url = `${await appUrl()}/api/auth/verify-email?token=${token}`;
  const m = emails.verify(user.name, url);
  await sendEmail(user.email, m.subject, m.html, m.text);
}
