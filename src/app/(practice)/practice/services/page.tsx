import type { Metadata } from "next";
import { PageHeader } from "@/components/app/ui";
import { ServicesManager } from "@/components/practice/ServicesManager";
import { requireRole } from "@/lib/server/auth";
import { getPractice } from "@/lib/server/practice";

export const metadata: Metadata = { title: "Services & fees" };

export default async function ServicesPage() {
  const me = await requireRole("psychologist", "/practice/services");
  const practice = await getPractice(me.id);
  return (
    <>
      <PageHeader
        title="Services & fees"
        description="What clients can book with you. Each service sets its own length, fee and consultation methods. Changes never alter sessions that are already booked."
      />
      <div className="max-w-3xl">
        <ServicesManager services={practice.services} />
        <p className="mt-6 text-sm text-ink-2">CalMe doesn&apos;t process payments yet: clients pay you directly, using the fee shown at booking.</p>
      </div>
    </>
  );
}
