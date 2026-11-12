import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, VerificationBadge } from "@/components/app/ui";
import { ResubmitForm } from "@/components/practice/ResubmitForm";
import { formatDate, VERIFICATION_META } from "@/lib/format";
import { requireRole } from "@/lib/server/auth";
import { getPractice, verificationHistory } from "@/lib/server/practice";

export const metadata: Metadata = { title: "Verification" };

const EXPLAIN = {
  pending: "Our team is checking your registration against the Ghana Psychological Council register. This usually takes 2–5 working days.",
  needs_info: "We need a little more information before we can verify you. Read the note below, update your profile or documents, then resubmit.",
  approved: "You're verified. Your profile is listed, and clients can book you whenever you have services and open hours.",
  rejected: "We couldn't verify your application. Read the note below. If something has changed, update your details and resubmit.",
} as const;

export default async function VerificationPage() {
  const me = await requireRole("psychologist", "/practice/verification");
  const [practice, history] = await Promise.all([getPractice(me.id), verificationHistory(me.id)]);
  const status = practice.verificationStatus;
  const latestNote = history.find((h) => h.reviewerNote)?.reviewerNote;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Verification" description="Every psychologist is checked before being listed, so clients can trust who they book." />
      <section className="panel-pop p-6" style={{ background: VERIFICATION_META[status].bg }}>
        <VerificationBadge status={status} />
        <p className="mt-3 text-[1.05rem]">{EXPLAIN[status]}</p>
        {latestNote && status !== "approved" && (
          <blockquote className="mt-4 rounded-2xl border-2 border-ink bg-white px-4 py-3">
            <b className="block text-sm">Note from the CalMe team</b>
            {latestNote}
          </blockquote>
        )}
        {(status === "needs_info" || status === "rejected") && (
          <div className="mt-4 grid gap-3">
            <p className="text-sm">
              Update your <Link href="/practice/profile" className="font-semibold underline">profile and documents</Link> first, then resubmit.
            </p>
            <ResubmitForm />
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="!text-xl">What we check</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          <li className="panel px-4 py-3">✓ Your {practice.licenseCategory} registration ({practice.licenseNumber}) is active on the GPC register</li>
          <li className="panel px-4 py-3">✓ Your name matches the registration</li>
          <li className="panel px-4 py-3">✓ The qualifications on your profile are genuine. Uploading certificates speeds this up.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="!text-xl">History</h2>
        <ol className="mt-3 grid gap-2">
          {history.map((h) => (
            <li key={h.id} className="panel flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <span>
                <b>Submitted {formatDate(h.createdAt, me.timezone)}</b>
                {h.applicantNote && <span className="block text-ink-2">Your note: {h.applicantNote}</span>}
                {h.reviewerNote && <span className="block text-ink-2">Reviewer: {h.reviewerNote}</span>}
              </span>
              <VerificationBadge status={h.status} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
