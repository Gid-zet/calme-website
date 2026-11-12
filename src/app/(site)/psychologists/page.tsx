import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/ui";
import { CompareTray } from "@/components/directory/CompareTray";
import { PsychologistCard } from "@/components/directory/PsychologistCard";
import { getActiveSpecializations, LANGUAGES } from "@/lib/server/catalog";
import { searchPsychologists, type DirectoryFilters } from "@/lib/server/directory";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Find a psychologist",
  description: "Browse GPC-verified psychologists, compare specialisations, fees and availability, and book a session online.",
};

const str = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);
const num = (v: string | string[] | undefined) => {
  const n = Number(str(v));
  return Number.isFinite(n) && str(v) ? n : undefined;
};

export default async function DirectoryPage({ searchParams }: PageProps<"/psychologists">) {
  await connection();
  const sp = await searchParams;
  const filters: DirectoryFilters = {
    q: str(sp.q),
    spec: str(sp.spec),
    lang: str(sp.lang),
    mode: sp.mode === "online" || sp.mode === "in_person" ? sp.mode : undefined,
    maxPrice: num(sp.maxPrice),
    minExp: num(sp.minExp),
    available: sp.available === "week" ? "week" : "any",
    sort: (["soonest", "rating", "price", "experience"] as const).find((s) => s === sp.sort) ?? "soonest",
  };
  const [specs, results, viewer] = await Promise.all([getActiveSpecializations(), searchPsychologists(filters), getSessionUser()]);
  const tz = viewer?.timezone ?? "Africa/Accra";
  const active = Object.entries(filters).filter(([k, v]) => v !== undefined && !(k === "available" && v === "any") && k !== "sort").length;

  return (
    <>
      <section className="border-b-[2.5px] border-ink bg-blue-soft pb-10 pt-[130px]">
        <div className="wrap">
          <p className="eyebrow">
            <i /> Find a psychologist
          </p>
          <h1 className="mb-3 mt-4 max-w-[18ch] text-[clamp(2.4rem,6vw,4rem)]">
            Someone who <em className="serif-em">gets it</em> is a few clicks away.
          </h1>
          <p className="lede">Every psychologist listed has been checked against the Ghana Psychological Council register. Compare approaches, fees and the next free slot.</p>
          <form role="search" action="/psychologists" className="mt-6 flex max-w-2xl gap-2">
            <label htmlFor="q" className="sr-only">
              Search by name or keyword
            </label>
            <input id="q" name="q" defaultValue={filters.q} placeholder="Search by name, title or keyword" className="input-sm flex-1 !rounded-full !px-5 !py-3 !text-base" />
            <button className="btn btn-primary">Search</button>
          </form>
        </div>
      </section>

      <section className="wrap grid gap-8 py-10 lg:grid-cols-[280px_1fr]">
        <aside>
          <form action="/psychologists" className="panel grid gap-4 p-5 lg:sticky lg:top-28" aria-label="Filters">
            <input type="hidden" name="q" value={filters.q ?? ""} />
            <div className="flex items-center justify-between">
              <b className="font-display text-lg">Filters</b>
              {active > 0 && (
                <Link href="/psychologists" className="text-sm font-semibold underline">
                  Clear all
                </Link>
              )}
            </div>
            <div className="field">
              <label htmlFor="spec">Specialisation</label>
              <select id="spec" name="spec" defaultValue={filters.spec ?? ""}>
                <option value="">Any</option>
                {specs.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="lang">Language</label>
              <select id="lang" name="lang" defaultValue={filters.lang ?? ""}>
                <option value="">Any</option>
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mode">Session type</label>
              <select id="mode" name="mode" defaultValue={filters.mode ?? ""}>
                <option value="">Any</option>
                <option value="online">Video call</option>
                <option value="in_person">In person</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="maxPrice">Max fee per session (GH₵)</label>
              <input id="maxPrice" name="maxPrice" type="number" min={0} step={50} defaultValue={filters.maxPrice} placeholder="Any" />
            </div>
            <div className="field">
              <label htmlFor="minExp">Experience</label>
              <select id="minExp" name="minExp" defaultValue={filters.minExp?.toString() ?? ""}>
                <option value="">Any</option>
                <option value="3">3+ years</option>
                <option value="5">5+ years</option>
                <option value="10">10+ years</option>
                <option value="15">15+ years</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="available" value="week" defaultChecked={filters.available === "week"} className="h-4 w-4 accent-[var(--blue)]" />
              Available in the next 7 days
            </label>
            <div className="field">
              <label htmlFor="sort">Sort by</label>
              <select id="sort" name="sort" defaultValue={filters.sort}>
                <option value="soonest">Soonest available</option>
                <option value="rating">Highest rated</option>
                <option value="price">Lowest fee</option>
                <option value="experience">Most experience</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm justify-center">Apply filters</button>
          </form>
        </aside>

        <div>
          <p className="mb-4 text-sm font-semibold text-ink-2" aria-live="polite">
            {results.length} psychologist{results.length === 1 ? "" : "s"} found
          </p>
          {results.length ? (
            <div className="grid gap-5">
              {results.map((p) => (
                <PsychologistCard key={p.id} p={p} viewerTz={tz} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="🔎"
              title="No psychologists match those filters"
              body="Try removing a filter or widening the fee range. New psychologists join regularly."
              action={
                <Link href="/psychologists" className="btn btn-white btn-sm">
                  Clear filters
                </Link>
              }
            />
          )}
        </div>
      </section>
      <CompareTray />
    </>
  );
}
