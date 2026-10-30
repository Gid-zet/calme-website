import Image from "next/image";
import Link from "next/link";
import { values } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";

export function About({ cta = true }: { cta?: boolean }) {
  return (
    <section className="section" id="about">
      <div className="wrap grid items-center gap-16 lg:grid-cols-[.9fr_1.1fr]">
        <Reveal className="relative max-w-[440px] lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden border-[2.5px] border-ink bg-sun shadow-[6px_6px_0_var(--line)]" style={{ borderRadius: "200px 200px 32px 32px" }}>
            <Image src="/images/good-things.jpg" alt="A participant holding a painting that reads 'Good things are coming'" fill sizes="(max-width: 1024px) 440px, 480px" className="object-cover object-[center_30%]" />
          </div>
          <div className="absolute -right-1.5 bottom-10 rotate-[4deg] rounded-[18px] border-[2.5px] border-ink bg-coral px-5 py-3.5 font-hand text-2xl leading-tight text-white shadow-[4px_4px_0_var(--line)] md:-right-[18px]">
            good things
            <br />
            are coming ✦
          </div>
        </Reveal>
        <Reveal delay={100}>
          <Eyebrow>About CalMe</Eyebrow>
          <h2 className="mb-6 mt-5">
            Care that feels like a <em className="serif-em">warm hug</em>, backed by real expertise.
          </h2>
          <p className="lede">
            CalMe was founded with a simple but powerful mission: to make quality mental health care accessible to everyone. We believe that mental
            wellbeing is a fundamental right, not a privilege.
          </p>
          <p className="mt-4">
            Our team of experienced professionals is dedicated to providing compassionate support, evidence-based treatment, and practical resources to
            help individuals and communities thrive mentally and emotionally.
          </p>
          <div className="my-8 flex flex-wrap gap-2.5">
            {values.map((v) => (
              <span key={v.label} className="rounded-full border-2 border-ink px-4 py-1.5 text-[.92rem] font-semibold" style={{ background: v.bg }}>
                {v.emoji} {v.label}
              </span>
            ))}
          </div>
          {cta && (
            <Link href="/about" className="btn btn-sun">
              Learn more about us
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}
