"use client";

import { useEffect, useRef } from "react";

type Props<T extends React.ElementType> = {
  as?: T;
  delay?: number;
} & React.ComponentPropsWithoutRef<T>;

/** Fades and lifts its children into view the first time they scroll on screen. */
export function Reveal<T extends React.ElementType = "div">({ as, delay = 0, className = "", style, ...rest }: Props<T>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = (as ?? "div") as React.ElementType;
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest} />;
}
