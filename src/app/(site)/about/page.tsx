import type { Metadata } from "next";
import { About } from "@/components/sections/About";
import { GetInvolved } from "@/components/sections/GetInvolved";
import { Marquee } from "@/components/sections/Marquee";
import { Newsletter } from "@/components/sections/Newsletter";
import { Services } from "@/components/sections/Services";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About CalMe"
        title={<>Mental wellbeing is a <em className="serif-em">right</em>, not a privilege.</>}
        lede="We exist to make quality mental health care accessible to everyone through professional support, education and community."
        bg="var(--blue-soft)"
      />
      <About cta={false} />
      <Marquee />
      <div className="h-16" />
      <Services />
      <GetInvolved />
      <Newsletter />
    </>
  );
}
