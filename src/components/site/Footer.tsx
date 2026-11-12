import Link from "next/link";
import { nav, site } from "@/lib/content";
import { Logo } from "./Logo";

const socialIcons = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.8-6.3L5.4 21H2.3l7.3-8.3L2 3h6.3l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" /></svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 8.5h3V21H3zM9 8.5h2.9v1.7c.4-.8 1.5-1.9 3.4-1.9 3.6 0 4.2 2.3 4.2 5.4V21h-3v-6.5c0-1.6 0-3.5-2.2-3.5s-2.4 1.7-2.4 3.4V21H9z" /></svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2c.3 2.3 1.7 3.9 4 4.1v3.1a7 7 0 0 1-4-1.3v6.6A6.5 6.5 0 1 1 10 8v3.2a3.3 3.3 0 1 0 3.3 3.3V2z" /></svg>
  ),
};

async function currentYear() {
  "use cache";
  return new Date().getFullYear();
}

export async function Footer() {
  const year = await currentYear();
  return (
    <footer className="border-t-[2.5px] border-ink bg-blue-deep pb-8 pt-20 text-[#cfdcff]">
      <div className="wrap">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-[36ch]">Dedicated to improving mental health and wellbeing through accessible, quality care and resources for all.</p>
            <div className="mt-6 flex gap-2.5">
              {(Object.keys(socialIcons) as (keyof typeof socialIcons)[]).map((k) => (
                <a
                  key={k}
                  href={site.socials[k]}
                  aria-label={k}
                  className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white/10 transition hover:-translate-y-1 hover:bg-sun hover:text-ink [&_svg]:h-[18px] [&_svg]:w-[18px]"
                >
                  {socialIcons[k]}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-4 font-display text-lg font-bold text-white">Quick links</h4>
            <ul className="grid gap-2">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="hover:text-sun">{n.label}</Link>
                </li>
              ))}
              <li><Link href="/psychologists" className="hover:text-sun">Book appointment</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-display text-lg font-bold text-white">Get in touch</h4>
            <ul className="grid gap-2">
              <li>{site.contact.address}</li>
              <li>{site.contact.phone}</li>
              <li><a href={`mailto:${site.contact.email}`} className="hover:text-sun">{site.contact.email}</a></li>
            </ul>
          </div>
        </div>
        <div
          aria-hidden
          className="mb-6 mt-14 select-none text-center font-display text-[clamp(4rem,17vw,15rem)] font-extrabold leading-[.85] tracking-[-.05em] text-transparent"
          style={{ WebkitTextStroke: "2px rgba(255,255,255,.18)" }}
        >
          CalMe
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-sm">
          <span>© {year} CalMe Mental Health. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-sun">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-sun">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
