import path from "node:path";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One database handle for the whole app.
 *
 * - DATABASE_URL set   → real PostgreSQL through postgres.js (production, staging, CI).
 * - DATABASE_URL unset → embedded PostgreSQL (PGlite) stored in .data/pglite, so local
 *   development needs no database install. Migrations run automatically on first use.
 *
 * Both are the same Postgres dialect, so queries, constraints and migrations are identical.
 */
export type Database = ReturnType<typeof drizzlePostgres<typeof schema>>;

const globalForDb = globalThis as unknown as { __calmeDb?: Promise<Database> };

async function connect(): Promise<Database> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: Number(process.env.DATABASE_POOL_SIZE ?? 10) });
    return drizzlePostgres(client, { schema });
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL is required in production.");
  }

  const [{ PGlite }, { btree_gist }, { drizzle: drizzlePglite }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("@electric-sql/pglite/contrib/btree_gist"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dataDir = path.resolve(/*turbopackIgnore: true*/ process.env.PGLITE_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "pglite"));
  (await import("node:fs")).mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = await PGlite.create(dataDir, { extensions: { btree_gist } });
  const db = drizzlePglite(client, { schema });
  await migrate(db, { migrationsFolder: path.join(/*turbopackIgnore: true*/ process.cwd(), "drizzle") });
  return db as unknown as Database;
}

export function getDb(): Promise<Database> {
  globalForDb.__calmeDb ??= connect().catch((err) => {
    globalForDb.__calmeDb = undefined;
    throw err;
  });
  return globalForDb.__calmeDb;
}

export { schema };
