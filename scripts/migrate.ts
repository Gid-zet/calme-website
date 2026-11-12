/** Applies SQL migrations in ./drizzle. Uses DATABASE_URL, or the local embedded database when unset. */
import path from "node:path";

async function main() {
  if (process.env.DATABASE_URL) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(process.env.DATABASE_URL, { max: 1 });
    await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    await client.end();
  } else {
    const { getDb } = await import("../src/db"); // runs migrations on connect
    await getDb();
  }
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
