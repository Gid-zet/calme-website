-- Database-level guarantee against double booking. Even if two requests pass the
-- application's availability check at the same instant, Postgres rejects the second
-- insert/update with SQLSTATE 23P01 (exclusion_violation).
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_psychologist_no_overlap"
  EXCLUDE USING gist ("psychologist_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
--> statement-breakpoint
-- A client can't hold two active sessions at the same time either.
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_no_overlap"
  EXCLUDE USING gist ("client_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
