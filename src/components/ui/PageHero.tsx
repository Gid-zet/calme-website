import { Eyebrow } from "./Eyebrow";
import { Star, Heart } from "./Icon";

export function PageHero({
  eyebrow,
  title,
  lede,
  bg = "var(--sun-soft)",
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  bg?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-hero border-b-[2.5px] border-ink" style={{ background: bg }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.08]"
        style={{ backgroundImage: "radial-gradient(var(--line) 1.2px, transparent 1.3px)", backgroundSize: "26px 26px" }}
      />
      <Star className="anim-bob absolute right-[8%] top-[28%] hidden w-14 md:block" />
      <Heart className="anim-bob absolute bottom-[18%] right-[18%] hidden w-11 md:block" style={{ animationDelay: ".6s" }} />
      <div className="wrap relative">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
    </section>
  );
}
