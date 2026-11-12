import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Stars } from "@/components/app/ui";
import { formatDate, formatMoney, formatTime, MODE_LABEL } from "@/lib/format";
import { getSlotsForNextDays } from "@/lib/server/booking";
import { getPsychologistProfile, recordProfileView } from "@/lib/server/directory";
import { getSessionUser } from "@/lib/server/session";
import { getSettings, policyText } from "@/lib/server/settings";
import { localDateOf } from "@/lib/scheduling/time";

export async function generateMetadata({ params }: PageProps<"/psychologists/[id]">): Promise<Metadata> {
  const p = await getPsychologistProfile((await params).id);
  return p ? { title: `${p.name}, ${p.title}`, description: p.bio.slice(0, 155) } : { title: "Psychologist not found" };
}

export default async function ProfilePage({ params }: PageProps<"/psychologists/[id]">) {
  await connection();
  const { id } = await params;
  const viewer = await getSessionUser();
  // Owners and admins can preview a profile that isn't public yet.
  const p = await getPsychologistProfile(id, { allowUnlisted: viewer?.id === id || viewer?.role === "admin" });
  if (!p) notFound();
  const listed = p.verificationStatus === "approved" && p.status === "active" && p.acceptingClients && p.services.length > 0;
  if (viewer?.role === "client") await recordProfileView(viewer.id, p.id);

  const tz = viewer?.timezone ?? "Africa/Accra";
  const preview = p.services[0] ? await getSlotsForNextDays(p.services[0].id, 7) : null;
  const byDay = new Map<string, Date[]>();
  for (const s of preview?.slots ?? []) {
    const d = localDateOf(s, tz);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(s);
  }
  const days = [...byDay.entries()].slice(0, 4);
  const settings = await getSettings();

  return (
    <>
      <section className="border-b-[2.5px] border-ink bg-mint-soft pb-12 pt-[130px]">
        <div className="wrap">
          {!listed && (
            <p className="mb-5 rounded-2xl border-2 border-ink bg-sun-soft px-4 py-3 text-sm font-semibold">
              Preview: this profile isn&apos;t visible to clients yet{p.verificationStatus !== "approved" ? " (verification pending)" : !p.services.length ? " (no active services)" : ""}.
            </p>
          )}
          <Link href="/psychologists" className="text-sm font-semibold underline">
            ← All psychologists
          </Link>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <Avatar name={p.name} fileId={p.avatarFileId} size={128} className="!rounded-[28px] shadow-[5px_5px_0_var(--line)]" />
            <div>
              <h1 className="text-[clamp(2.2rem,5vw,3.4rem)]">{p.name}</h1>
              <p className="mt-1 text-lg text-ink-2">
                {p.title} · {p.yearsExperience} years experience
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {p.verificationStatus === "approved" && <span className="badge bg-white">✓ {p.licenseCategory}, verified with the {p.licensingBody}</span>}
                <Stars rating={p.rating} count={p.reviewCount} />
                {p.location && <span className="badge bg-white">📍 {p.location}</span>}
                <span className="badge bg-white">🗣 {p.languages.join(", ")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap grid gap-10 py-12 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-10">
          <section>
            <h2 className="!text-2xl">About</h2>
            <p className="mt-3 whitespace-pre-line text-[1.05rem] leading-relaxed text-ink-2">{p.bio}</p>
          </section>
          <section>
            <h2 className="!text-2xl">Areas of focus</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {p.specializations.map((s) => (
                <li key={s.slug}>
                  <Link href={`/psychologists?spec=${s.slug}`} className="badge bg-sun-soft !px-3 !py-1 !text-sm hover:bg-sun">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="!text-2xl">Qualifications</h2>
            <ul className="mt-3 grid gap-2">
              {p.credentials.map((c, i) => (
                <li key={i} className="panel flex items-center gap-3 px-4 py-3">
                  <span aria-hidden>🎓</span>
                  <div>
                    <b>{c.title}</b>
                    <span className="block text-sm text-ink-2">{[c.institution, c.year].filter(Boolean).join(", ")}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="!text-2xl">Services &amp; fees</h2>
            <ul className="mt-3 grid gap-3">
              {p.services.map((s) => (
                <li key={s.id} className="panel-pop flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <b className="font-display text-lg">{s.name}</b>
                    <span className="block text-sm text-ink-2">
                      {s.durationMinutes} min · {s.modes.map((m) => MODE_LABEL[m]).join(" or ")}
                    </span>
                    {s.description && <p className="mt-1 text-sm text-ink-2">{s.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <b className="text-lg">{formatMoney(s.priceMinor, s.currency)}</b>
                    {listed && (
                      <Link href={`/psychologists/${p.id}/book?service=${s.id}`} className="btn btn-primary btn-sm">
                        Book
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="!text-2xl">Reviews</h2>
            {p.reviews.length ? (
              <ul className="mt-3 grid gap-3">
                {p.reviews.map((r, i) => (
                  <li key={i} className="panel p-4">
                    <div className="flex items-center justify-between gap-2">
                      <b>{r.clientName}</b>
                      <span className="text-[#e3a008]" aria-label={`${r.rating} out of 5`}>
                        {"★".repeat(r.rating)}
                        <span className="text-ink/20">{"★".repeat(5 - r.rating)}</span>
                      </span>
                    </div>
                    {r.comment && <p className="mt-1 text-ink-2">{r.comment}</p>}
                    <span className="mt-1 block text-xs text-ink-2">{formatDate(r.createdAt, tz)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-ink-2">No reviews yet. Reviews come only from clients who completed a session.</p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[28px] border-[2.5px] border-ink bg-ink p-6 text-cream shadow-[6px_6px_0_var(--sun)]">
            <span className="hand text-2xl text-sun">next openings</span>
            {days.length ? (
              <div className="mt-4 grid gap-3">
                {days.map(([d, slots]) => (
                  <div key={d}>
                    <b className="text-sm">{formatDate(slots[0], tz, { year: undefined })}</b>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {slots.slice(0, 4).map((s) => (
                        <Link key={s.toISOString()} href={`/psychologists/${p.id}/book?service=${p.services[0].id}&start=${encodeURIComponent(s.toISOString())}`} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold hover:bg-sun hover:text-ink">
                          {formatTime(s, tz)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#b9bedf]">No openings in the next 7 days. Check later dates in the booking calendar.</p>
            )}
            {listed && (
              <Link href={`/psychologists/${p.id}/book`} className="btn btn-sun mt-5 w-full justify-center">
                See all times &amp; book
              </Link>
            )}
            <p className="mt-4 text-xs text-[#b9bedf]">
              Times shown in {tz.replace(/_/g, " ")}. {p.autoConfirm ? "Bookings are confirmed instantly." : "Your psychologist confirms each request."} {policyText(settings)}
            </p>
          </div>
          <p className="mt-4 text-sm text-ink-2">
            In crisis? Don&apos;t wait for an appointment.{" "}
            <Link href="/resources#crisis" className="font-bold underline">
              Get help now
            </Link>
            .
          </p>
        </aside>
      </div>
    </>
  );
}
