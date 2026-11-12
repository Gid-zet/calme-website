import { and, count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setReviewHidden, setServiceActive } from "@/app/admin-actions";
import { AccountStatusControl, ActionButton, ReviewDecision } from "@/components/admin/AdminControls";
import { Avatar, StatusBadge, VerificationBadge } from "@/components/app/ui";
import { getDb } from "@/db";
import { appointments, reviews, users } from "@/db/schema";
import { formatDate, formatDateTime, formatMoney, MODE_LABEL } from "@/lib/format";
import { maskName } from "@/lib/server/admin";
import { requireRole } from "@/lib/server/auth";
import { getPractice, overridesFor, verificationHistory } from "@/lib/server/practice";
import { localDateOf, minutesToHHMM } from "@/lib/scheduling/time";
import { getActiveSpecializations } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Review psychologist" };
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminPsychologist({ params }: PageProps<"/admin/psychologists/[id]">) {
  const { id } = await params;
  const admin = await requireRole("admin", `/admin/psychologists/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [u] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, "psychologist")));
  if (!u) notFound();
  const [p, history, specs, byStatus, recent, revs] = await Promise.all([
    getPractice(id),
    verificationHistory(id),
    getActiveSpecializations(),
    db.select({ s: appointments.status, n: count() }).from(appointments).where(eq(appointments.psychologistId, id)).groupBy(appointments.status),
    db
      .select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status, serviceName: appointments.serviceName, clientName: users.name })
      .from(appointments)
      .innerJoin(users, eq(users.id, appointments.clientId))
      .where(eq(appointments.psychologistId, id))
      .orderBy(desc(appointments.startsAt))
      .limit(10),
    db.select().from(reviews).where(eq(reviews.psychologistId, id)).orderBy(desc(reviews.createdAt)).limit(20),
  ]);
  const overrides = await overridesFor(id, localDateOf(new Date(), p.timezone));
  const tz = admin.timezone;
  const specNames = specs.filter((s) => p.specializationIds.includes(s.id)).map((s) => s.name);

  return (
    <div className="grid gap-6">
      <Link href="/admin/psychologists" className="text-sm font-semibold underline">
        ← Psychologists
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={u.name} fileId={u.avatarFileId} size={72} className="!rounded-[20px]" />
        <div className="flex-1">
          <h1 className="text-[clamp(1.6rem,3.5vw,2.3rem)]">{u.name}</h1>
          <p className="text-ink-2">
            {p.title} · {u.email} · {u.phone ?? "no phone"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <VerificationBadge status={p.verificationStatus} />
            <span className="badge capitalize" style={{ background: u.status === "active" ? "var(--mint-soft)" : "var(--coral-soft)" }}>
              Account {u.status}
            </span>
            <span className="badge bg-white">{u.emailVerifiedAt ? "✓ Email confirmed" : "Email not confirmed"}</span>
            <span className="badge bg-white">Joined {formatDate(u.createdAt, tz)}</span>
          </div>
        </div>
        <Link href={`/psychologists/${id}`} className="btn btn-white btn-sm">
          View profile
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="grid content-start gap-6">
          <section className="panel p-5">
            <h2 className="!text-xl">Registration to verify</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["Register", p.licensingBody],
                ["Category", p.licenseCategory],
                ["Registration number", p.licenseNumber],
                ["Licence valid until", p.licenseExpiresOn ? formatDate(p.licenseExpiresOn, tz) : "Not provided"],
                ["Years of experience", String(p.yearsExperience)],
                ["Languages", p.languages.join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-xs font-bold uppercase tracking-[.08em] text-ink-2">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ink-2">Check the number and name against the Ghana Psychological Council register before approving.</p>
          </section>

          <section className="panel p-5">
            <h2 className="!text-xl">Qualifications &amp; documents</h2>
            <ul className="mt-3 grid gap-2">
              {p.credentials.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/70 px-3 py-2">
                  <span>
                    <b>{c.title}</b>
                    <span className="block text-sm text-ink-2">{[c.kind, c.institution, c.year].filter(Boolean).join(" · ")}</span>
                  </span>
                  {c.documentFileId ? (
                    <a href={`/api/files/${c.documentFileId}`} target="_blank" rel="noreferrer" className="btn btn-white btn-sm">
                      Open document
                    </a>
                  ) : (
                    <span className="text-xs text-ink-2">No document</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-2">Opening a document is recorded in the activity log.</p>
          </section>

          <section className="panel p-5">
            <h2 className="!text-xl">Practice</h2>
            <p className="mt-2 text-sm">{specNames.join(" · ") || "No specialisations"}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{p.bio}</p>
            <h3 className="mt-5 !text-base">Services</h3>
            <ul className="mt-2 grid gap-2">
              {p.services.length ? (
                p.services.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className={s.active ? "" : "text-ink-2 line-through"}>
                      <b>{s.name}</b> · {s.durationMinutes} min · {formatMoney(s.priceMinor, s.currency)} · {s.modes.map((m) => MODE_LABEL[m]).join("/")}
                    </span>
                    <ActionButton action={setServiceActive.bind(null, s.id, !s.active)} label={s.active ? "Hide service" : "Show service"} />
                  </li>
                ))
              ) : (
                <li className="text-sm text-ink-2">No services yet.</li>
              )}
            </ul>
            <h3 className="mt-5 !text-base">Weekly hours ({p.timezone})</h3>
            <p className="mt-1 text-sm">
              {[1, 2, 3, 4, 5, 6, 0]
                .map((d) => {
                  const r = p.rules.filter((x) => x.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
                  return r.length ? `${DAY[d]} ${r.map((x) => `${minutesToHHMM(x.startMinute)}–${minutesToHHMM(x.endMinute)}`).join(", ")}` : null;
                })
                .filter(Boolean)
                .join(" · ") || "No hours set"}
            </p>
            {overrides.length > 0 && <p className="mt-1 text-sm text-ink-2">{overrides.length} upcoming date change{overrides.length > 1 ? "s" : ""} (time off or custom hours).</p>}
            <p className="mt-1 text-sm text-ink-2">
              Break {p.bufferMinutes} min · notice {p.minNoticeHours} h · horizon {p.maxAdvanceDays} days · {p.autoConfirm ? "auto-confirm" : "manual confirmation"} · {p.acceptingClients ? "accepting clients" : "paused"}
            </p>
          </section>

          <section className="panel p-5">
            <h2 className="!text-xl">Appointment history</h2>
            <p className="mt-1 text-sm">{byStatus.map((b) => `${b.s.replace("_", "-")}: ${b.n}`).join(" · ") || "No appointments yet."}</p>
            {recent.length > 0 && (
              <ul className="mt-3 divide-y divide-ink/10 text-sm">
                {recent.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/appointments/${a.id}`} className="flex items-center justify-between gap-3 py-2 hover:underline">
                      <span>
                        {formatDateTime(a.startsAt, tz)} · {a.serviceName} · client {maskName(a.clientName)}
                      </span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {revs.length > 0 && (
            <section className="panel p-5">
              <h2 className="!text-xl">Reviews</h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {revs.map((r) => (
                  <li key={r.id} className={`flex flex-wrap items-start justify-between gap-2 ${r.hidden ? "opacity-60" : ""}`}>
                    <span>
                      <span className="text-[#e3a008]">{"★".repeat(r.rating)}</span> {r.comment ?? <i className="text-ink-2">No comment</i>} {r.hidden && <span className="badge bg-[#eee]">Hidden</span>}
                    </span>
                    <ActionButton action={setReviewHidden.bind(null, r.id, !r.hidden)} label={r.hidden ? "Unhide" : "Hide"} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="grid content-start gap-6">
          <section className="panel-pop p-5" style={{ background: "var(--lilac-soft)" }}>
            <h2 className="!text-xl">Verification decision</h2>
            <p className="mb-3 mt-1 text-sm text-ink-2">Approving lists the psychologist publicly once they have active services and hours. They&apos;re notified by email either way.</p>
            <ReviewDecision psychologistId={id} current={p.verificationStatus} />
          </section>
          <section className="panel p-5">
            <h2 className="!text-xl">History</h2>
            <ol className="mt-3 grid gap-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="rounded-xl bg-cream px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <b>{formatDate(h.createdAt, tz)}</b>
                    <VerificationBadge status={h.status} />
                  </div>
                  {h.applicantNote && <p className="text-ink-2">Applicant: {h.applicantNote}</p>}
                  {h.reviewerNote && <p className="text-ink-2">Reviewer: {h.reviewerNote}</p>}
                </li>
              ))}
            </ol>
          </section>
          <section className="panel p-5">
            <h2 className="!text-xl">Account</h2>
            {u.statusReason && <p className="mt-1 text-sm text-ink-2">Last status reason: {u.statusReason}</p>}
            <div className="mt-3">
              <AccountStatusControl userId={id} status={u.status} self={false} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
