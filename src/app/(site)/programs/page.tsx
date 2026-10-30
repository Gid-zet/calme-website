import type { Metadata } from "next";
import { Newsletter } from "@/components/sections/Newsletter";
import { ProgramCard, SuggestProgram } from "@/components/sections/Programs";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { programs } from "@/lib/content";

export const metadata: Metadata = { title: "Programs" };

export default function ProgramsPage() {
  const groups = [
    { title: "Upcoming", items: programs.filter((p) => p.status === "upcoming") },
    { title: "Past programs", items: programs.filter((p) => p.status === "past") },
  ];
  return (
    <>
      <PageHero
        eyebrow="Our programs"
        title={<>Workshops, events &amp; <em className="serif-em">initiatives</em></>}
        lede="Discover our workshops, events, and initiatives designed to promote mental health and wellbeing in our community."
        bg="var(--mint-soft)"
      />
      <section className="section">
        <div className="wrap">
          {groups.map((g) => (
            <div key={g.title} className="mb-14">
              <h2 className="mb-8 !text-[clamp(1.8rem,3.5vw,2.5rem)]">{g.title}</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {g.items.map((p, i) => (
                  <Reveal key={p.slug} delay={i * 80}>
                    <ProgramCard p={p} />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
          <SuggestProgram />
        </div>
      </section>
      <Newsletter />
    </>
  );
}
