import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

export type Role = SessionUser["role"];

export const HOME_FOR_ROLE: Record<Role, string> = {
  client: "/dashboard",
  psychologist: "/practice",
  admin: "/admin",
};

/** Only allow same-site relative paths as post-login destinations (prevents open redirects). */
export function safeNext(next: unknown, role: Role): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return HOME_FOR_ROLE[role];
  const area = next.startsWith("/admin") ? "admin" : next.startsWith("/practice") ? "psychologist" : next.startsWith("/dashboard") ? "client" : null;
  if (area && area !== role) return HOME_FOR_ROLE[role];
  return next;
}

/** Data Access Layer entry point: use in every page, action and route handler that needs a user. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  return user;
}

export async function requireRole(role: Role | Role[], next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) redirect(HOME_FOR_ROLE[user.role]);
  return user;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403, message = status === 401 ? "Please sign in." : "You don't have access to this.") {
    super(message);
  }
}

/** Same check for Route Handlers, which should return 401/403 instead of redirecting. */
export async function assertRole(role: Role | Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401);
  if (!(Array.isArray(role) ? role : [role]).includes(user.role)) throw new AuthError(403);
  return user;
}
