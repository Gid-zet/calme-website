import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Heart, Icon, Squiggle, Star } from "../ui/Icon";
import { Reveal } from "../ui/Reveal";

const avatars = ["good-things", "panda-balloons", "duo", "group-trio"];

export function Hero() {
  return (
    <section className="overflow-hidden pb-16 pt-[150px] max-md:pt-[120px]">
      <div className="wrap grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <Reveal>
          <Eyebrow>{site.tagline}</Eyebrow>
          <h1 className="mb-6 mt-5 text-[clamp(2.9rem,7vw,5.6rem)]">
            Your mental health is our{" "}
            <span className="relative inline-block font-bold italic text-blue">
              priority
              <Squiggle className="absolute -bottom-[.12em] -left-[4%] h-[.35em] w-[108%] overflow-visible" />
            </span>
            .
          </h1>
          <p className="lede">{site.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/book" className="btn btn-primary">
              Book appointment <Icon name="arrow" strokeWidth={2.5} />
            </Link>
            <Link href="/resources" className="btn btn-white">
              Explore resources
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-4">
            <div className="flex">
              {avatars.map((a, i) => (
                <Image
                  key={a}
                  src={`/images/${a}.jpg`}
                  alt=""
                  width={88}
                  height={88}
                  className="h-11 w-11 rounded-full border-[2.5px] border-cream object-cover object-[center_20%]"
                  style={{ marginLeft: i ? -12 : 0 }}
                />
              ))}
            </div>
            <div>
              <b className="block font-display text-[1.6rem] leading-none">100K+</b>
              <small className="font-medium text-ink-2">people trust CalMe</small>
            </div>
          </div>
        </Reveal>

        <Reveal className="relative mx-auto h-[400px] w-full max-w-[560px] md:h-[480px] lg:h-[560px] lg:max-w-none" delay={120}>
          <div className="anim-morph absolute inset-[30px_0_0_30px] border-[2.5px] border-ink bg-blue" style={{ borderRadius: "58% 42% 55% 45% / 48% 55% 45% 52%" }} />
          <figure className="polaroid left-0 top-[16%] w-full -rotate-3">
            <div className="ph aspect-[3/2]" style={{ height: "auto" }}>
              <Image
                src="/images/team-acity.jpg"
                alt="The CalMe Mental Health Group team together at Academic City University, Ghana"
                fill
                sizes="(max-width: 1024px) 90vw, 600px"
                className="object-cover object-[center_62%]"
                priority
              />
            </div>
            <figcaption>the CalMe family ♡</figcaption>
          </figure>
          <div className="sticker anim-spin right-[4%] top-0 h-[90px] w-[90px] rounded-full bg-sun font-hand text-[1.15rem] leading-none md:h-[118px] md:w-[118px] md:text-[1.45rem]">
            <span className="anim-spin-rev block">you are<br />not alone</span>
          </div>
          <div className="sticker anim-bob -bottom-[4%] -left-[2%] flex gap-2.5 rounded-[18px] bg-white px-4 py-3 text-[.8rem] md:bottom-[6%] md:text-[.92rem]">
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full border-2 border-ink bg-mint">
              <Icon name="check" className="h-4 w-4" strokeWidth={3} />
            </span>
            Safe, judgment-free space
          </div>
          <Star className="anim-bob absolute left-[46%] top-[-2%] z-[4] w-[54px]" />
          <Heart className="anim-bob absolute -right-[2%] bottom-[4%] z-[4] w-[46px]" style={{ animationDuration: "4.5s", animationDelay: ".6s" }} />
        </Reveal>
      </div>
    </section>
  );
}
