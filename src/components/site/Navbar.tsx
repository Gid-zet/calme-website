"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav } from "@/lib/content";
import { Logo } from "./Logo";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-3.5 z-50">
        <div className="wrap pointer-events-auto flex items-center justify-between gap-4 rounded-full border-2 border-ink bg-white/85 py-2 pl-4 pr-2.5 shadow-[4px_4px_0_var(--line)] backdrop-blur-md">
          <Logo />
          <ul className="hidden gap-1 lg:flex">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-full px-3.5 py-2 text-[.95rem] font-semibold transition-colors hover:bg-sun-soft ${active ? "bg-sun" : ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/sign-in" className="rounded-full px-3.5 py-2 text-[.95rem] font-semibold hover:bg-sun-soft">
              Sign in
            </Link>
            <Link href="/book" className="btn btn-primary btn-sm">
              Book appointment
            </Link>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-sun lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-[2.5px] w-[18px] rounded bg-ink transition-transform" style={{ transform: open ? "rotate(45deg)" : undefined }}>
              <span className="absolute left-0 block h-[2.5px] w-[18px] rounded bg-ink transition-all" style={{ top: open ? 0 : -6, opacity: open ? 0 : 1 }} />
              <span className="absolute left-0 block h-[2.5px] w-[18px] rounded bg-ink transition-transform" style={{ top: open ? 0 : 6, transform: open ? "rotate(-90deg)" : undefined }} />
            </span>
          </button>
        </div>
      </header>

      {open && (
        <nav
          aria-label="Mobile"
          className="fixed inset-x-4 top-20 z-40 flex flex-col gap-1 rounded-3xl border-[2.5px] border-ink bg-white p-4 shadow-[6px_6px_0_var(--line)] lg:hidden"
          style={{ animation: "fade .2s" }}
        >
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-lg font-bold hover:bg-sun-soft">
              {item.label}
            </Link>
          ))}
          <Link href="/sign-in" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-lg font-bold hover:bg-sun-soft">
            Sign in
          </Link>
          <Link href="/book" onClick={() => setOpen(false)} className="btn btn-primary mt-2 justify-center">
            Book appointment
          </Link>
        </nav>
      )}
    </>
  );
}
