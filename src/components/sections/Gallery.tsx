"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { sipAndPaint } from "@/lib/content";
import { Reveal } from "../ui/Reveal";

// Desktop placement on a 12-column grid; mobile falls back to a 2-column flow
const layout = [
  "lg:col-[1/8] lg:row-[1/5] col-span-2 aspect-[3/2]",
  "lg:col-[8/13] lg:row-[1/6] aspect-[3/4]",
  "lg:col-[1/4] lg:row-[5/9] aspect-[3/4]",
  "lg:col-[4/8] lg:row-[5/9] aspect-[3/4]",
  "lg:col-[8/13] lg:row-[6/9] aspect-[3/4]",
];

export function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const photo = open !== null ? sipAndPaint.photos[open] : null;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => ((o ?? 0) + 1) % sipAndPaint.photos.length);
      if (e.key === "ArrowLeft") setOpen((o) => ((o ?? 0) - 1 + sipAndPaint.photos.length) % sipAndPaint.photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-12 lg:grid-rows-[repeat(8,110px)] lg:gap-5">
        {sipAndPaint.photos.map((p, i) => (
          <Reveal key={p.src} delay={(i % 3) * 80} className={`${layout[i]} lg:aspect-auto`}>
            <button
              onClick={() => setOpen(i)}
              className="group relative block h-full w-full cursor-zoom-in overflow-hidden rounded-[22px] border-[2.5px] border-ink bg-white shadow-[6px_6px_0_var(--line)] transition-transform duration-300 hover:-translate-y-1.5 hover:-rotate-[.6deg]"
            >
              <Image src={p.src} alt={p.alt} fill sizes="(max-width: 1024px) 50vw, 600px" className="object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: p.pos }} />
              <span className="absolute bottom-3 left-3 rounded-full border-2 border-ink bg-white px-3.5 py-1 font-hand text-xl leading-tight">{p.cap}</span>
            </button>
          </Reveal>
        ))}
      </div>

      {photo && (
        <div
          role="dialog"
          aria-label="Photo viewer"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[200] grid cursor-zoom-out place-items-center bg-ink/90 p-5"
          style={{ animation: "fade .25s" }}
        >
          <Image src={photo.src} alt={photo.alt} width={photo.w} height={photo.h} className="max-h-[88vh] w-auto rounded-2xl border-[3px] border-white" />
          <p className="font-hand text-2xl text-white">{photo.cap}</p>
        </div>
      )}
    </>
  );
}
