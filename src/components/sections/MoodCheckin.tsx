"use client";

import Link from "next/link";
import { useState } from "react";
import { moods } from "@/lib/content";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";

export function MoodCheckin() {
  const [selected, setSelected] = useState<string | null>(null);
  const mood = moods.find((m) => m.key === selected);

  return (
    <section className="section !pt-[120px]">
      <div className="wrap">
        <Reveal className="card-pop grid items-center gap-10 !bg-lilac-soft p-[clamp(1.6rem,5vw,3.5rem)] lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>Quick check-in</Eyebrow>
            <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.1rem)]">
              How are you <em className="serif-em">really</em> feeling today?
            </h2>
            <p className="lede mt-4">No right or wrong answers. Tap a mood and we&apos;ll point you somewhere helpful.</p>
          </div>
          <div>
            <div className="grid grid-cols-5 gap-1.5 md:gap-3" role="group" aria-label="Choose your mood">
              {moods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelected(m.key)}
                  aria-pressed={selected === m.key}
                  className={`group flex flex-col items-center gap-1.5 rounded-[14px] border-[2.5px] border-ink px-0.5 pb-2 pt-3 text-[.68rem] font-bold shadow-[3px_3px_0_var(--line)] transition-transform duration-300 hover:-translate-y-1.5 md:rounded-[20px] md:pb-3 md:pt-4 md:text-sm ${selected === m.key ? "bg-sun" : "bg-white"}`}
                >
                  <span className="text-[1.6rem] leading-none transition-transform duration-300 group-hover:-rotate-8 group-hover:scale-125 md:text-[2.1rem]">{m.face}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <div aria-live="polite" className="mt-5 min-h-[92px] rounded-[20px] border-[2.5px] border-dashed border-ink bg-white px-5 py-4 font-medium">
              {mood ? (
                <>
                  <b className="mb-1 block font-display text-lg">{mood.title}</b>
                  {mood.body}{" "}
                  <Link href={mood.link.href} className="font-bold text-blue underline underline-offset-4">
                    {mood.link.label} →
                  </Link>
                </>
              ) : (
                <>
                  <b className="mb-1 block font-display text-lg">Pick a feeling above ✨</b>
                  Whatever you&apos;re carrying today, checking in with yourself is a great first step.
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
