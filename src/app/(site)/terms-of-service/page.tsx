import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = { title: "Terms of Service" };

// TODO: add the organization's legal text
export default function Page() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Service" bg="var(--blue-soft)" />
      <section className="section">
        <div className="wrap max-w-3xl text-ink-2">
          <p>This page is being prepared. Please contact us if you have any questions in the meantime.</p>
        </div>
      </section>
    </>
  );
}
