import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, EmptyState, Stars } from "@/components/app/ui";
import { formatDateTime, formatMoney, MODE_LABEL } from "@/lib/format";
import { nextAvailableSlot } from "@/lib/server/booking";
import { getPsychologistProfile } from "@/lib/server/directory";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Compare psychologists" };

export default async function ComparePage({ searchParams }: PageProps<"/psychologists/compare">) {
  await connection();
  const { ids } = await searchParams;
  const list = (typeof ids === "string" ? ids.split(",") : []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 3);
  const [viewer, ...profiles] = await Promise.all([getSessionUser(), ...list.map((id) => getPsychologistProfile(id))]);
  const people = profiles.filter((p): p is NonNullable<typeof p> => Boolean(p));
  const tz = viewer?.timezone ?? "Africa/Accra";
  const next = await Promise.all(people.map((p) => (p.services[0] ? nextAvailableSlot(p.id, Math.min(...p.services.map((s) => s.durationMinutes))) : null)));

  const rows: [string, (p: (typeof people)[number], i: number) => React.ReactNode][] = [
    ["Rating", (p) => <Stars rating={p.rating} count={p.reviewCount} />],
    ["Experience", (p) => `${p.yearsExperience} years`],
    ["Register category", (p) => p.licenseCategory],
    ["Focus areas", (p) => p.specializations.map((s) => s.name).join(", ")],
    ["Languages", (p) => p.languages.join(", ")],
    ["Session types", (p) => [...new Set(p.services.flatMap((s) => s.modes))].map((m) => MODE_LABEL[m]).join(", ")],
    ["Fees", (p) => p.services.map((s) => `${s.name}: ${formatMoney(s.priceMinor, s.currency)} / ${s.durationMinutes} min`).join(" · ")],
    ["Location", (p) => p.location ?? "Online only"],
    ["Next available", (_p, i) => (next[i] ? formatDateTime(next[i]!, tz) : "No openings in 3 weeks")],
    ["Confirmation", (p) => (p.autoConfirm ? "Instant" : "On request")],
  ];

  return (
    <section className="wrap pb-20 pt-[130px]">
      <Link href="/psychologists" className="text-sm font-semibold underline">
        ← Back to all psychologists
      </Link>
      <h1 className="mb-8 mt-4 text-[clamp(2.2rem,5vw,3.4rem)]">Compare psychologists</h1>
      {people.length < 2 ? (
        <EmptyState icon="⚖️" title="Pick at least two psychologists to compare" body="Tick “Compare” on up to three profiles in the directory." action={<Link href="/psychologists" className="btn btn-primary btn-sm">Browse psychologists</Link>} />
      ) : (
        <div className="overflow-x-auto rounded-[20px] border-2 border-ink bg-white">
          <table className="tbl min-w-[640px]">
            <thead>
              <tr>
                <th className="w-40" scope="col">
                  <span className="sr-only">Attribute</span>
                </th>
                {people.map((p) => (
                  <th key={p.id} scope="col" className="!normal-case !tracking-normal">
                    <div className="flex items-center gap-3 py-1">
                      <Avatar name={p.name} fileId={p.avatarFileId} size={48} />
                      <div>
                        <span className="block font-display text-base font-bold text-ink">{p.name}</span>
                        <span className="text-xs font-medium">{p.title}</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, render]) => (
                <tr key={label}>
                  <th scope="row" className="!bg-white !text-[.7rem]">
                    {label}
                  </th>
                  {people.map((p, i) => (
                    <td key={p.id}>{render(p, i)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {people.map((p) => (
                  <td key={p.id}>
                    <Link href={`/psychologists/${p.id}/book`} className="btn btn-primary btn-sm">
                      Book
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
