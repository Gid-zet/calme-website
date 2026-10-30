"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "../ui/Icon";

const tabs = [
  { key: "message", label: "Send a message", emoji: "💬" },
  { key: "partner", label: "Partner with us", emoji: "🤝" },
  { key: "volunteer", label: "Volunteer", emoji: "🙋" },
] as const;
type Tab = (typeof tabs)[number]["key"];

const volunteerAreas = ["Event Support", "Administrative Assistance", "Community Outreach", "Marketing & Communications", "Fundraising", "Other"];

export function ContactForms() {
  const params = useSearchParams();
  const initial = (tabs.find((t) => t.key === params.get("form"))?.key ?? "message") as Tab;
  const [tab, setTab] = useState<Tab>(initial);
  const [sent, setSent] = useState<Tab | null>(null);

  // TODO: wire submissions to an API route / email service
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(tab);
    e.currentTarget.reset();
  };

  return (
    <div>
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border-2 border-ink px-4 py-2 text-sm font-bold transition ${tab === t.key ? "bg-ink text-cream" : "bg-white hover:bg-sun-soft"}`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <form key={tab} onSubmit={submit} className="card-pop grid gap-4 p-[clamp(1.4rem,4vw,2.4rem)] sm:grid-cols-2" style={{ animation: "fade .3s" }}>
        {tab === "message" && (
          <>
            <div className="field"><label htmlFor="fn">First name *</label><input id="fn" required autoComplete="given-name" /></div>
            <div className="field"><label htmlFor="ln">Last name *</label><input id="ln" required autoComplete="family-name" /></div>
            <div className="field"><label htmlFor="em">Email address *</label><input id="em" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="ph">Phone number</label><input id="ph" type="tel" autoComplete="tel" /></div>
            <div className="field sm:col-span-2"><label htmlFor="sj">Subject *</label><input id="sj" required /></div>
            <div className="field sm:col-span-2"><label htmlFor="msg">Message *</label><textarea id="msg" required placeholder="Tell us a little about what you need…" /></div>
          </>
        )}
        {tab === "partner" && (
          <>
            <p className="text-ink-2 sm:col-span-2">
              CalMe collaborates with organizations that share our commitment to improving mental health. Tell us about your idea and we&apos;ll be in touch.
            </p>
            <div className="field"><label htmlFor="org">Organization name *</label><input id="org" required /></div>
            <div className="field"><label htmlFor="pem">Email *</label><input id="pem" type="email" required /></div>
            <div className="field sm:col-span-2"><label htmlFor="idea">Partnership idea *</label><textarea id="idea" required /></div>
          </>
        )}
        {tab === "volunteer" && (
          <>
            <p className="text-ink-2 sm:col-span-2">
              Whether you have professional skills to contribute or simply a passion for mental health advocacy, there&apos;s a place for you.
            </p>
            <div className="field"><label htmlFor="vn">Your name *</label><input id="vn" required /></div>
            <div className="field"><label htmlFor="vem">Email *</label><input id="vem" type="email" required /></div>
            <div className="field sm:col-span-2">
              <label htmlFor="area">Areas of interest *</label>
              <select id="area" required defaultValue="">
                <option value="" disabled>Select an area</option>
                {volunteerAreas.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="field sm:col-span-2"><label htmlFor="about">Tell us about yourself *</label><textarea id="about" required /></div>
          </>
        )}
        <button className="btn btn-primary justify-center sm:col-span-2" type="submit">
          {tab === "message" ? "Send message" : tab === "partner" ? "Submit partnership inquiry" : "Submit volunteer application"}
          <Icon name="send" strokeWidth={2.5} />
        </button>
        {sent === tab && (
          <div role="status" className="form-ok sm:col-span-2">
            Thank you! 💙 We&apos;ve received your {tab === "message" ? "message" : tab === "partner" ? "partnership inquiry" : "application"} and will be in touch soon.
          </div>
        )}
      </form>
    </div>
  );
}
