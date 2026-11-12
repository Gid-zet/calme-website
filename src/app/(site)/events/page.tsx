import type { Metadata } from "next";
import { Newsletter } from "@/components/sections/Newsletter";
import { SipAndPaint } from "@/components/sections/SipAndPaint";
import { TalkShow } from "@/components/sections/TalkShow";
import { PageHero } from "@/components/ui/PageHero";
import Link from "next/link";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <>
      <PageHero
        eyebrow="Events"
        title={<>Moments that make us feel <em className="serif-em">lighter</em>.</>}
        lede="From paint nights to support circles, our events are a gentle, fun way to connect and care for your mind."
      >
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="#sip-and-paint" className="btn btn-primary">See Sip &amp; Paint photos</Link>
          <Link href="/programs" className="btn btn-white">Upcoming programs</Link>
        </div>
      </PageHero>
      <SipAndPaint cta={false} />
      <TalkShow />
      <Newsletter />
    </>
  );
}
