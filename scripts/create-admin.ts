/**
 * Bootstrap an administrator. This is the ONLY way to create the first admin; there is no public admin sign-up.
 *
 *   npm run admin:create -- --email ops@cal-me.org --name "Ama Mensah"
 *
 * Prints a one-time invitation link (valid 72 hours) where the admin sets their own password,
 * so no password ever appears in shell history or logs. Run it with the same DATABASE_URL as the app.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import { activityLogs, authTokens, users } from "../src/db/schema";
import { randomToken, sha256 } from "../src/lib/server/crypto";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
    console.error('Usage: npm run admin:create -- --email someone@example.org --name "Full Name"');
    process.exit(1);
  }
  const db = await getDb();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing && existing.role !== "admin") {
    console.error(`${email} already has a ${existing.role} account. Use a different email for the admin account.`);
    process.exit(1);
  }
  const user = existing ?? (await db.insert(users).values({ email, name, role: "admin", status: "active" }).returning())[0];
  const token = randomToken();
  await db.insert(authTokens).values({ userId: user.id, type: "admin_invite", tokenHash: sha256(token), expiresAt: new Date(Date.now() + 72 * 3600_000) });
  await db.insert(activityLogs).values({ actorId: null, action: "admin.bootstrap_invite", entityType: "user", entityId: user.id, metadata: { via: "cli" } });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  console.log(`\nAdmin invitation for ${name} <${email}> (valid 72 hours):\n${base}/invite?token=${token}\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
