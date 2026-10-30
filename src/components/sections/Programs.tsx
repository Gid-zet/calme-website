import Link from "next/link";
import { programs } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";
import { ProgramArt } from "./ProgramArt";

export function ProgramCard({ p }: { p: (typeof programs)[number] }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-[22px] border-[2.5px] border-ink bg-white p-6 shadow-[4px_4px_0_var(--line)] transition-transform duration-300 hover:-translate-y-1.5">
      <div className="relative grid h-[150px] place-items-center rounded-2xl border-2 border-ink" style={{ background: p.artBg }}>
        <ProgramArt name={p.art} />
        <span className={`absolute right-3 top-3 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold ${p.status === "upcoming" ? "bg-mint" : "bg-white"}`}>
          {p.status === "upcoming" ? "Upcoming" : "Past event"}
        </span>
      </div>
      <span className="self-start rounded-full border-2 border-ink px-3 py-1 text-xs font-extrabold uppercase tracking-[.08em]" style={{ background: p.tagBg }}>
        {p.tag}
      </span>
      <h3>{p.title}</h3>
      <p className="text-[.96rem] text-ink-2">{p.body}</p>
      <Link href={p.slug === "sip-and-paint" ? "/events" : "/contact"} className="mt-auto inline-flex items-center gap-1.5 font-bold text-blue">
        {p.slug === "sip-and-paint" ? "See the photos →" : "Register interest →"}
      </Link>
    </article>
  );
}

export function SuggestProgram() {
  return (
    <Reveal className="mt-10 flex flex-wrap items-center justify-between gap-6 rounded-[22px] border-[2.5px] border-dashed border-ink bg-mint-soft px-8 py-6">
      <div>
        <h3 className="mb-1">Suggest a program 💡</h3>
        <p className="max-w-[60ch] text-ink-2">
          Have an idea for a mental health program or workshop that could benefit our community? We&apos;d love to hear from you and explore potential
          collaborations.
        </p>
      </div>
      <Link href="/contact" className="btn btn-white">
        Share your idea
      </Link>
    </Reveal>
  );
}

export function Programs() {
  return (
    <section className="section" id="programs">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <Eyebrow>Our programs</Eyebrow>
            <h2>
              Workshops, events &amp; <em className="serif-em">initiatives</em>
            </h2>
          </div>
          <p className="lede">Discover programs designed to promote mental health and wellbeing in our community.</p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p, i) => (
            <Reveal key={p.slug} delay={i * 80}>
              <ProgramCard p={p} />
            </Reveal>
          ))}
        </div>
        <SuggestProgram />
      </div>
    </section>
  );
}
