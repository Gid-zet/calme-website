import type { Metadata } from "next";
import { BookingFlow } from "@/components/sections/BookingFlow";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Book an appointment" };

export default function BookPage() {
  return (
    <>
      <PageHero
        eyebrow="Book an appointment"
        title={<>Let&apos;s find a time to <em className="serif-em">talk</em>.</>}
        lede="Four quick steps and you're booked in with one of our licensed psychologists."
        bg="var(--mint-soft)"
      />
      <section className="section !pt-16">
        <div className="wrap">
          <BookingFlow />
        </div>
      </section>
    </>
  );
}
