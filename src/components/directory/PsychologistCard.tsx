import Link from "next/link";
import { formatDateTime, formatMoney, MODE_LABEL } from "@/lib/format";
import type { DirectoryCard } from "@/lib/server/directory";
import { Avatar, Stars } from "../app/ui";
import { CompareToggle } from "./CompareTray";

export function PsychologistCard({ p, viewerTz, compact }: { p: DirectoryCard; viewerTz: string; compact?: boolean }) {
  return (
    <article className="panel-pop flex flex-col gap-4 p-5 sm:flex-row" aria-labelledby={`p-${p.id}`}>
      <Avatar name={p.name} fileId={p.avatarFileId} size={compact ? 64 : 88} className="!rounded-[22px]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 id={`p-${p.id}`} className="!text-xl">
              <Link href={`/psychologists/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
            </h3>
            <p className="text-sm text-ink-2">
              {p.title} · {p.yearsExperience} yrs experience{p.location ? ` · ${p.location}` : ""}
            </p>
          </div>
          <span className="badge bg-mint-soft" title="Registration checked by CalMe against the Ghana Psychological Council register">
            ✓ GPC verified
          </span>
        </div>
        <div className="mt-2">
          <Stars rating={p.rating} count={p.reviewCount} />
        </div>
        {!compact && <p className="mt-2 line-clamp-2 text-[.95rem] text-ink-2">{p.bio}</p>}
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Specialisations">
          {p.specializations.slice(0, compact ? 3 : 5).map((s) => (
            <li key={s.slug} className="badge bg-sun-soft">
              {s.name}
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-ink-2">From</dt>
            <dd className="font-bold">{p.minPriceMinor != null ? formatMoney(p.minPriceMinor) : "–"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Sessions</dt>
            <dd className="font-semibold">{p.modes.map((m) => MODE_LABEL[m]).join(" · ") || "–"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Languages</dt>
            <dd className="font-semibold">{p.languages.join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-2">Next available</dt>
            <dd className="font-semibold text-[#15803d]">{p.nextAvailable ? formatDateTime(p.nextAvailable, viewerTz) : <span className="text-ink-2">Fully booked</span>}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href={`/psychologists/${p.id}/book`} className="btn btn-primary btn-sm">
            Book a session
          </Link>
          <Link href={`/psychologists/${p.id}`} className="btn btn-white btn-sm">
            View profile
          </Link>
          {!compact && <CompareToggle id={p.id} name={p.name} />}
        </div>
      </div>
    </article>
  );
}
