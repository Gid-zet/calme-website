import Link from "next/link";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";

const cards = [
  {
    key: "volunteer",
    eyebrow: "Volunteer",
    title: "Become a volunteer",
    body: "Volunteers play a crucial role in supporting our mission. Whether you have professional skills to contribute or simply a passion for mental health advocacy, there are many ways to get involved.",
    chips: ["Event Support", "Community Outreach", "Marketing & Comms", "Fundraising", "Admin"],
    bg: "var(--mint)",
    cta: "Apply to volunteer",
    btn: "btn-white",
    deco: (
      <>
        <circle cx="50" cy="50" r="40" fill="#fff" stroke="var(--line)" strokeWidth="3" />
        <path d="M50 72 C 30 58, 26 48, 30 40 a 10 10 0 0 1 20 -2 a 10 10 0 0 1 20 2 c 4 8 0 18 -20 32z" fill="var(--coral)" stroke="var(--line)" strokeWidth="3" />
      </>
    ),
  },
  {
    key: "partner",
    eyebrow: "Partner",
    title: "Partner with us",
    body: "CalMe collaborates with organizations that share our commitment to improving mental health. If you represent a business, non-profit, or community group, we'd love to explore opportunities for collaboration.",
    chips: ["Businesses", "Non-profits", "Schools", "Community groups"],
    bg: "var(--blue-soft)",
    cta: "Start a partnership",
    btn: "btn-primary",
    deco: (
      <>
        <circle cx="50" cy="50" r="40" fill="var(--sun)" stroke="var(--line)" strokeWidth="3" />
        <circle cx="40" cy="50" r="14" fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle cx="60" cy="50" r="14" fill="none" stroke="var(--line)" strokeWidth="3" />
      </>
    ),
  },
];

export function GetInvolved() {
  return (
    <section className="section" id="involved">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <Eyebrow>Get involved</Eyebrow>
            <h2>
              Let&apos;s build a <em className="serif-em">kinder</em> community, together.
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((c, i) => (
            <Reveal key={c.key} delay={i * 80} className="relative overflow-hidden rounded-[32px] border-[2.5px] border-ink p-9 shadow-[6px_6px_0_var(--line)]" style={{ background: c.bg }}>
              <svg viewBox="0 0 100 100" className="absolute -right-8 -top-8 w-[150px]" aria-hidden>
                {c.deco}
              </svg>
              <Eyebrow>{c.eyebrow}</Eyebrow>
              <h3 className="my-3 !text-[1.9rem]">{c.title}</h3>
              <p className="max-w-[46ch] text-ink-2">{c.body}</p>
              <div className="mb-6 mt-5 flex flex-wrap gap-2">
                {c.chips.map((chip) => (
                  <span key={chip} className="rounded-full border-2 border-ink bg-white px-3 py-1 text-[.85rem] font-semibold">
                    {chip}
                  </span>
                ))}
              </div>
              <Link href={`/contact?form=${c.key}`} className={`btn ${c.btn}`}>
                {c.cta}
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
