import { affirmations } from "@/lib/content";

export function Marquee() {
  const items = [...affirmations, ...affirmations];
  return (
    <div aria-hidden className="-mx-5 my-5 -rotate-[1.5deg] overflow-hidden border-y-[2.5px] border-ink bg-ink py-4 text-cream">
      <div className="anim-scroll flex w-max gap-10">
        {items.map((a, i) => (
          <span key={i} className="flex items-center gap-10 whitespace-nowrap font-display text-[1.3rem] font-medium italic md:text-[1.7rem]">
            {a}
            <span className="not-italic text-sun">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}
