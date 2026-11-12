import Image from "next/image";
import { talkShow } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Icon } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";

const tilts = ["-rotate-2", "rotate-2"];

export function TalkShow() {
  return (
    <section className="section overflow-hidden bg-blue-soft" id="talk-show">
      <div className="wrap grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <Reveal>
          <Eyebrow>Talk show</Eyebrow>
          <h2 className="mt-4">
            Real talk about <em className="serif-em">mental health</em> at Academic City.
          </h2>
          <p className="lede mt-5">
            We took the conversation to campus. Students, our team and a guest speaker came together for an honest talk show on mental
            wellbeing: breaking the stigma, knowing when to reach out, and looking after each other.
          </p>
          <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border-[2.5px] border-ink bg-white px-4 py-2 font-semibold shadow-[4px_4px_0_var(--line)]">
            <Icon name="pin" className="h-4 w-4" strokeWidth={2.5} />
            {talkShow.venue}
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-5 md:gap-8">
          {talkShow.photos.map((p, i) => (
            <Reveal key={p.src} delay={i * 100} className={i === 1 ? "mt-10 md:mt-16" : ""}>
              <figure
                className={`relative rounded-[10px] border-[2.5px] border-ink bg-white p-2.5 pb-11 shadow-[6px_6px_0_var(--line)] transition-transform duration-300 hover:rotate-0 hover:scale-[1.03] ${tilts[i]}`}
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-[4px]">
                  <Image src={p.src} alt={p.alt} fill sizes="(max-width: 1024px) 45vw, 320px" className="object-cover" style={{ objectPosition: p.pos }} />
                </div>
                <figcaption className="absolute inset-x-0 bottom-2 text-center font-hand text-[1.35rem] font-bold">{p.cap}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
