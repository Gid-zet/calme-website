import { About } from "@/components/sections/About";
import { Breathe } from "@/components/sections/Breathe";
import { GetInvolved } from "@/components/sections/GetInvolved";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { MoodCheckin } from "@/components/sections/MoodCheckin";
import { Newsletter } from "@/components/sections/Newsletter";
import { Programs } from "@/components/sections/Programs";
import { Resources } from "@/components/sections/Resources";
import { Services } from "@/components/sections/Services";
import { SipAndPaint } from "@/components/sections/SipAndPaint";
import { TalkShow } from "@/components/sections/TalkShow";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <MoodCheckin />
      <About />
      <Services />
      <Breathe />
      <SipAndPaint />
      <TalkShow />
      <Programs />
      <Resources />
      <GetInvolved />
      <Newsletter />
    </>
  );
}
