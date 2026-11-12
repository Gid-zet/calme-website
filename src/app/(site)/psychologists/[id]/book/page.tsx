import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResendVerificationButton } from "@/components/auth/PasswordForms";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/ui/PageHero";
import { requireRole } from "@/lib/server/auth";
import { getPsychologistProfile } from "@/lib/server/directory";
import { getSettings, policyText } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Book a session" };

export default async function BookPage({ params, searchParams }: PageProps<"/psychologists/[id]/book">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const qs = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const user = await requireRole("client", `/psychologists/${id}/book${qs ? `?${qs}` : ""}`);
  const p = await getPsychologistProfile(id);
  if (!p) notFound();
  const settings = await getSettings();
  const start = typeof sp.start === "string" && !Number.isNaN(Date.parse(sp.start)) ? sp.start : undefined;

  return (
    <>
      <PageHero
        eyebrow="Book a session"
        title={
          <>
            Book with <em className="serif-em">{p.name}</em>
          </>
        }
        lede={`${p.title} · ${p.yearsExperience} years experience`}
        bg="var(--mint-soft)"
      />
      <section className="section !pt-12">
        <div className="wrap">
          {!user.emailVerified ? (
            <div className="card-pop mx-auto grid max-w-xl gap-4 p-8 text-center">
              <span className="text-4xl" aria-hidden>
                ✉️
              </span>
              <h2 className="!text-3xl">Confirm your email first</h2>
              <p className="text-ink-2">
                We need a confirmed email so we can send you booking confirmations and reminders. Check your inbox for the link we sent to <b>{user.email}</b>.
              </p>
              <div className="flex justify-center">
                <ResendVerificationButton className="btn btn-primary" />
              </div>
            </div>
          ) : !p.services.length ? (
            <p className="text-center text-ink-2">
              This psychologist has no bookable services right now. <Link href="/psychologists" className="font-bold underline">Find another psychologist</Link>.
            </p>
          ) : (
            <BookingWizard
              psychologist={{ id: p.id, name: p.name, title: p.title, autoConfirm: p.autoConfirm, location: p.location }}
              services={p.services.map((s) => ({ id: s.id, name: s.name, description: s.description, durationMinutes: s.durationMinutes, priceMinor: s.priceMinor, currency: s.currency, modes: s.modes }))}
              timeZone={user.timezone}
              initialServiceId={typeof sp.service === "string" ? sp.service : undefined}
              initialStart={start}
              policy={policyText(settings)}
            />
          )}
        </div>
      </section>
    </>
  );
}
