"use client";

import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "../ui/Eyebrow";
import { Reveal } from "../ui/Reveal";

const phases = [
  { label: "Breathe in", expand: true },
  { label: "Hold", expand: true },
  { label: "Breathe out", expand: false },
  { label: "Hold", expand: false },
];

export function Breathe() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(4);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        setPhase((p) => (p + 1) % phases.length);
        return 4;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [running]);

  const toggle = () => {
    setPhase(0);
    setCount(4);
    setRunning((r) => !r);
  };

  const current = phases[phase];

  return (
    <section className="section" id="breathe">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <Eyebrow>Take a moment</Eyebrow>
          <h2 className="mb-5 mt-4">
            Let&apos;s <em className="serif-em">breathe</em> together.
          </h2>
          <p className="lede">Box breathing is a simple technique to calm a racing mind. Follow the bubble for a few rounds. Your shoulders will thank you.</p>
          <div className="mb-8 mt-6 flex flex-wrap gap-2.5">
            {["breathe in", "hold", "breathe out", "hold"].map((s, i) => (
              <span key={i} className="rounded-[14px] border-2 border-ink bg-white px-3.5 py-2 text-sm font-bold">
                <span className="text-blue">4s</span> {s}
              </span>
            ))}
          </div>
          <button onClick={toggle} className="btn btn-primary">
            {running ? "Stop" : "Start breathing"}
          </button>
        </Reveal>
        <Reveal className="relative mx-auto grid aspect-square w-full max-w-[460px] place-items-center" delay={100}>
          <div className="absolute inset-0 rounded-full border-[2.5px] border-dashed border-ink/25" />
          <div className="absolute inset-[12%] rounded-full border-[2.5px] border-dashed border-ink/25" />
          <div
            className="relative z-[2] grid aspect-square w-[46%] place-items-center rounded-full border-[2.5px] border-ink text-center text-white shadow-[6px_6px_0_var(--line)] transition-transform duration-[4000ms] ease-[cubic-bezier(.45,0,.55,1)]"
            style={{
              background: "radial-gradient(circle at 32% 30%, #9cc2ff, var(--blue) 65%)",
              transform: running && current.expand ? "scale(1.75)" : "scale(1)",
            }}
          >
            <div aria-live="polite">
              <b className="block font-display text-[clamp(1.1rem,3vw,1.6rem)] font-semibold italic">{running ? current.label : "Ready?"}</b>
              {running && <span className="font-display text-3xl font-bold">{count}</span>}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
