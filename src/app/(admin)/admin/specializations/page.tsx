import { asc, count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { SpecializationRow } from "@/components/admin/AdminControls";
import { PageHeader } from "@/components/app/ui";
import { getDb } from "@/db";
import { psychologistSpecializations, specializations } from "@/db/schema";
import { requireRole } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Specialisations" };

export default async function SpecializationsPage() {
  await requireRole("admin", "/admin/specializations");
  const db = await getDb();
  const rows = await db
    .select({ id: specializations.id, name: specializations.name, active: specializations.active, n: count(psychologistSpecializations.psychologistId) })
    .from(specializations)
    .leftJoin(psychologistSpecializations, eq(psychologistSpecializations.specializationId, specializations.id))
    .groupBy(specializations.id)
    .orderBy(asc(specializations.name));
  return (
    <div className="max-w-3xl">
      <PageHeader title="Specialisations" description="The areas psychologists can choose and clients can filter by. Hiding one removes it from filters and profiles without deleting anyone's data." />
      <div className="panel grid gap-3 p-5">
        {rows.map((r) => (
          <div key={r.id} className={r.active ? "" : "opacity-60"}>
            <SpecializationRow id={r.id} name={r.name} active={r.active} count={r.n} />
          </div>
        ))}
        <div className="border-t-2 border-dashed border-ink/20 pt-3">
          <SpecializationRow id={null} name="" active />
        </div>
      </div>
    </div>
  );
}
