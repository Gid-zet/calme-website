import { services } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Icon } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";

const tilts = ["-rotate-[1.5deg]", "rotate-1", "-rotate-[.5deg]", "rotate-[1.5deg]"];

export function Services() {
  return (
    <section className="section border-y-[2.5px] border-ink bg-blue text-white" id="services">
      <div className="wrap">
        <Reveal className="sec-head">
          <div>
            <Eyebrow>How we help</Eyebrow>
            <h2>
              Support that meets you <em className="serif-em !text-sun">where you are</em>
            </h2>
          </div>
          <p className="lede !text-[#d6e4ff]">From one-on-one sessions to community events, there&apos;s more than one way to start feeling better.</p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <article
                className={`flex h-full flex-col gap-3 rounded-[22px] border-[2.5px] border-ink px-6 pb-6 pt-7 text-ink shadow-[6px_6px_0_var(--line)] transition-transform duration-300 hover:-translate-y-2 hover:rotate-0 lg:min-h-[300px] ${tilts[i]}`}
                style={{ background: s.bg }}
              >
                <div className="grid h-[60px] w-[60px] place-items-center rounded-[18px] border-[2.5px] border-ink bg-white">
                  <Icon name={s.icon} className="h-[30px] w-[30px]" />
                </div>
                <h3>{s.title}</h3>
                <p className="text-[.97rem] text-[#2a2f55]">{s.body}</p>
                <span className="mt-auto font-display font-extrabold opacity-50">0{i + 1}</span>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
