"use client";

import { useState } from "react";
import { Reveal } from "../ui/Reveal";

export function Newsletter() {
  const [done, setDone] = useState(false);
  return (
    <section className="pb-[110px] pt-10">
      <div className="wrap">
        <Reveal className="card-pop grid items-center gap-8 !bg-coral p-[clamp(2rem,5vw,3.5rem)] lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-[clamp(2rem,4.5vw,3.2rem)] text-white [text-shadow:3px_3px_0_var(--line)]">Good things in your inbox.</h2>
            <p className="mt-3 font-medium">Subscribe to receive our latest news, event invites and gentle wellbeing tips.</p>
          </div>
          {/* TODO: connect to newsletter provider */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
              e.currentTarget.reset();
            }}
            className="flex gap-1.5 rounded-[22px] border-[2.5px] border-ink bg-white p-1.5 shadow-[4px_4px_0_var(--line)] max-sm:flex-col sm:rounded-full"
          >
            <input type="email" required placeholder="you@email.com" aria-label="Email address" className="min-w-0 flex-1 bg-transparent px-4 py-2.5 outline-none" />
            <button className="btn btn-sun justify-center !py-3 !shadow-none hover:!transform-none" type="submit">
              {done ? "Subscribed! 💛" : "Subscribe"}
            </button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
