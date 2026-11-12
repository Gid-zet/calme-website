import Link from "next/link";
import { crisisLines, topics } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";

export function CrisisCard() {
  return (
    <aside id="crisis" className="scroll-mt-28 rounded-[32px] border-[2.5px] border-cream bg-coral p-8 text-ink shadow-[6px_6px_0_var(--cream)]">
      <Eyebrow dot="var(--blue)">Need help now?</Eyebrow>
      <h3 className="mb-2.5 mt-3 !text-[1.7rem]">You don&apos;t have to wait.</h3>
      <p>If you&apos;re experiencing a mental health crisis or need immediate support, please reach out to these emergency resources:</p>
      {crisisLines.map((c) => (
        <div key={c.label} className="mt-3 rounded-2xl border-2 border-ink bg-white px-4 py-3">
          <small className="block text-xs font-bold uppercase tracking-[.08em] text-ink-2">{c.label}</small>
          <b>{c.value}</b>
        </div>
      ))}
      <Link href="/psychologists" className="btn btn-white mt-5 w-full justify-center">
        Book with a professional
      </Link>
    </aside>
  );
}

export function Resources() {
  return (
    <section className="section border-y-[2.5px] border-ink bg-ink text-cream" id="resources">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <Eyebrow>Resources</Eyebrow>
            <h2>
              Mental health <em className="serif-em !text-sun">toolkit</em>
            </h2>
          </div>
          <p className="lede !text-[#b9bedf]">
            Access our collection of expert-created resources to help you understand and manage various aspects of mental health and wellbeing.
          </p>
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {topics.map((t, i) => (
              <Reveal key={t.title} delay={(i % 2) * 70}>
                <Link
                  href="/resources"
                  className="flex h-full items-start gap-4 rounded-[22px] border-2 border-cream/20 p-5 transition hover:translate-x-1 hover:border-sun hover:bg-white/5"
                >
                  <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl text-[1.7rem]" style={{ background: t.bg }}>
                    {t.emoji}
                  </span>
                  <div>
                    <h3 className="mb-1 !text-[1.12rem]">{t.title}</h3>
                    <p className="text-[.92rem] text-[#b9bedf]">{t.body}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <CrisisCard />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
