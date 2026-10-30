import Link from "next/link";
import { sipAndPaint } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";
import { Gallery } from "./Gallery";

const stats = [
  { emoji: "🎨", label: "Art as therapy" },
  { emoji: "🤝", label: "New friendships" },
  { emoji: "💛", label: "Zero pressure" },
];

export function SipAndPaint({ cta = true }: { cta?: boolean }) {
  return (
    <section className="section overflow-hidden border-y-[2.5px] border-ink bg-sun-soft" id="sip-and-paint">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.08]"
        style={{ backgroundImage: "radial-gradient(var(--line) 1.2px, transparent 1.3px)", backgroundSize: "26px 26px" }}
      />
      <div className="wrap relative">
        <Reveal className="mb-14 grid items-end gap-12 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <Eyebrow>Featured event</Eyebrow>
            <h2 className="mt-4">
              <span
                className="inline-block bg-clip-text pr-[.08em] italic text-transparent"
                style={{ backgroundImage: "linear-gradient(100deg, var(--coral), var(--sun) 40%, var(--mint) 70%, var(--blue))" }}
              >
                Sip &amp; Paint
              </span>
              <br />
              brushes, laughter &amp; good company.
            </h2>
          </div>
          <div>
            <p className="lede">
              We traded stress for paintbrushes. Under string lights in front of a beach mural, our community sipped, painted and opened up, proving
              that creativity is one of the best forms of self-care.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              {stats.map((s) => (
                <div key={s.label} className="min-w-[130px] flex-1 rounded-[20px] border-[2.5px] border-ink bg-white px-5 py-4 shadow-[4px_4px_0_var(--line)]">
                  <b className="block text-3xl leading-none">{s.emoji}</b>
                  <small className="font-semibold text-ink-2">{s.label}</small>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Gallery />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {sipAndPaint.quotes.map((q, i) => (
            <Reveal key={q.q} delay={i * 80} className="rounded-[22px] border-[2.5px] border-ink p-6 shadow-[4px_4px_0_var(--line)]" style={{ background: q.bg }}>
              <div className="font-hand text-[2rem] leading-tight">{q.q}</div>
              <p className="mt-2 text-[.95rem] text-ink-2">{q.body}</p>
            </Reveal>
          ))}
        </div>

        {cta && (
          <Reveal className="mt-12 text-center">
            <Link href="/events" className="btn btn-primary">
              Join our next event
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}
