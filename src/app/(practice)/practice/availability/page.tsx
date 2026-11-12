import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/ui";
import { BookingRulesForm, OverridesEditor, WeeklyHoursEditor } from "@/components/practice/AvailabilityEditor";
import { requireRole } from "@/lib/server/auth";
import { getPractice, overridesFor } from "@/lib/server/practice";
import { localDateOf } from "@/lib/scheduling/time";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const me = await requireRole("psychologist", "/practice/availability");
  const practice = await getPractice(me.id);
  const today = localDateOf(new Date(), practice.timezone);
  const overrides = await overridesFor(me.id, today);
  return (
    <>
      <PageHeader
        title="Availability"
        description={`Clients only ever see times inside these hours, minus existing bookings, your break time and minimum notice. All times are in ${practice.timezone.replace(/_/g, " ")}.`}
        actions={
          practice.services[0] ? (
            <Link href={`/psychologists/${me.id}`} className="btn btn-white btn-sm">
              Preview what clients see
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <WeeklyHoursEditor rules={practice.rules} />
        <div className="grid content-start gap-6">
          <BookingRulesForm
            settings={{
              bufferMinutes: practice.bufferMinutes,
              minNoticeHours: practice.minNoticeHours,
              maxAdvanceDays: practice.maxAdvanceDays,
              timezone: practice.timezone,
              autoConfirm: practice.autoConfirm,
              acceptingClients: practice.acceptingClients,
            }}
          />
          <OverridesEditor overrides={overrides} today={today} />
        </div>
      </div>
    </>
  );
}
