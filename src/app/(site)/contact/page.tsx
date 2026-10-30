import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForms } from "@/components/sections/ContactForms";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/PageHero";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: "Contact" };

const info: { icon: IconName; label: string; value: React.ReactNode; bg: string }[] = [
  { icon: "pin", label: "Address", value: site.contact.address, bg: "var(--sun)" },
  { icon: "phone", label: "Phone", value: site.contact.phone, bg: "var(--mint)" },
  { icon: "mail", label: "Email", value: <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>, bg: "var(--coral-soft)" },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title={<>Say <em className="serif-em">hello</em> 👋</>}
        lede="Have questions or want to get involved? We'd love to hear from you."
        bg="var(--coral-soft)"
      />
      <section className="section">
        <div className="wrap grid items-start gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div className="grid gap-3.5">
            {info.map((i) => (
              <div key={i.label} className="flex items-center gap-4 rounded-[18px] border-2 border-ink bg-white p-4">
                <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] border-2 border-ink" style={{ background: i.bg }}>
                  <Icon name={i.icon} className="h-[22px] w-[22px]" />
                </span>
                <div>
                  <small className="block text-xs font-bold uppercase tracking-[.1em] text-ink-2">{i.label}</small>
                  <span className="font-semibold">{i.value}</span>
                </div>
              </div>
            ))}
            <div className="rounded-[18px] border-2 border-ink bg-lilac-soft p-5">
              <div className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
                <Icon name="clock" className="h-5 w-5" /> Opening hours
              </div>
              {site.contact.hours.map(([d, h]) => (
                <div key={d} className="flex justify-between border-b border-dashed border-ink/25 py-1.5 last:border-0">
                  <span>{d}</span>
                  <b>{h}</b>
                </div>
              ))}
            </div>
          </div>
          <Suspense>
            <ContactForms />
          </Suspense>
        </div>
      </section>
    </>
  );
}
