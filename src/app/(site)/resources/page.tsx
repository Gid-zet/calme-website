import type { Metadata } from "next";
import { Breathe } from "@/components/sections/Breathe";
import { MoodCheckin } from "@/components/sections/MoodCheckin";
import { Resources } from "@/components/sections/Resources";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Resources" };

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title={<>Tools for the <em className="serif-em">tough</em> days and the good ones.</>}
        lede="Access our collection of expert-created resources to help you understand and manage various aspects of mental health."
        bg="var(--lilac-soft)"
      />
      <MoodCheckin />
      <Resources />
      <Breathe />
    </>
  );
}
