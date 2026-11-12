"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useSyncExternalStore } from "react";
import { signUpClient, signUpPsychologist } from "@/app/(auth)/actions";
import { LICENSE_CATEGORIES, type FormState } from "@/lib/validation";
import { Field, FieldError, FormMessage, PasswordField, SelectField, SubmitButton, TextArea } from "../forms/Field";
import { Icon, type IconName } from "../ui/Icon";

type Role = "client" | "psychologist";
type Spec = { id: string; name: string };

const roles: { key: Role; icon: IconName; title: string; body: string; bg: string }[] = [
  { key: "client", icon: "user", title: "I'm looking for support", body: "Find a psychologist & book sessions", bg: "var(--sun-soft)" },
  { key: "psychologist", icon: "stethoscope", title: "I'm a psychologist", body: "Offer sessions & manage your practice", bg: "var(--mint-soft)" },
];

const noopSubscribe = () => () => {};
/** The visitor's IANA time zone; the server render assumes Ghana and the client corrects it on hydration. */
function useBrowserTimezone() {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Accra",
    () => "Africa/Accra",
  );
}

function Terms({ error }: { error?: string }) {
  return (
    <div>
      <label className="flex items-start gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-[var(--blue)]" />
        <span>
          I agree to the <Link href="/terms-of-service" target="_blank" className="font-semibold text-ink underline">Terms</Link> and{" "}
          <Link href="/privacy-policy" target="_blank" className="font-semibold text-ink underline">Privacy Policy</Link>, and consent to CalMe processing
          my information to arrange appointments.
        </span>
      </label>
      <FieldError error={error} />
    </div>
  );
}

export function SignUpForm({ initialRole, specializations, languages }: { initialRole: Role; specializations: Spec[]; languages: string[] }) {
  const [role, setRole] = useState<Role>(initialRole);
  return (
    <div style={{ animation: "fade .4s" }}>
      <span className="hand text-2xl text-blue">hello there ✿</span>
      <h1 className="mb-2 mt-1 text-[clamp(2.2rem,5vw,3rem)]">Create your account</h1>
      <p className="mb-6 text-ink-2">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-bold text-blue underline underline-offset-4">
          Sign in
        </Link>
      </p>

      <fieldset className="mb-6 grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">I am joining as…</legend>
        {roles.map((r) => (
          <label
            key={r.key}
            className={`cursor-pointer rounded-[18px] border-[2.5px] border-ink p-4 transition focus-within:ring-2 focus-within:ring-blue ${role === r.key ? "shadow-[4px_4px_0_var(--blue)] ring-2 ring-blue" : "shadow-[3px_3px_0_var(--line)]"}`}
            style={{ background: r.bg }}
          >
            <input type="radio" name="role-choice" value={r.key} checked={role === r.key} onChange={() => setRole(r.key)} className="sr-only" />
            <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-white">
              <Icon name={r.icon} className="h-5 w-5" />
            </span>
            <b className="block text-[.95rem] leading-tight">{r.title}</b>
            <span className="text-xs text-ink-2">{r.body}</span>
          </label>
        ))}
      </fieldset>

      {role === "client" ? <ClientForm languages={languages} /> : <PsychologistForm specializations={specializations} languages={languages} />}
    </div>
  );
}

function ClientForm({ languages }: { languages: string[] }) {
  const [state, action] = useActionState(signUpClient, {} as FormState);
  const tz = useBrowserTimezone();
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-4" style={{ animation: "fade .3s" }}>
      <FormMessage message={state.message} />
      <input type="hidden" name="timezone" value={tz} />
      <Field label="Full name" name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={v.name} error={e.name} />
      <Field label="Email address" name="email" type="email" required autoComplete="email" placeholder="you@email.com" defaultValue={v.email} error={e.email} />
      <Field label="Phone number" name="phone" type="tel" optional autoComplete="tel" placeholder="+233 24 123 4567" defaultValue={v.phone} error={e.phone} hint="Only used for appointment reminders." />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Preferred language (optional)" name="preferredLanguage" defaultValue={v.preferredLanguage ?? ""} error={e.preferredLanguage}>
          <option value="">No preference</option>
          {languages.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </SelectField>
        <Field label="Pronouns" name="pronouns" optional maxLength={30} placeholder="e.g. she/her" defaultValue={v.pronouns} error={e.pronouns} />
      </div>
      <PasswordField name="password" label="Password" autoComplete="new-password" showStrength error={e.password} />
      <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" error={e.confirmPassword} />
      <Terms error={e.terms} />
      <SubmitButton className="btn btn-primary mt-2" pendingLabel="Creating your account…">
        Create account <Icon name="arrow" strokeWidth={2.5} />
      </SubmitButton>
    </form>
  );
}

type Credential = { kind: "degree" | "license" | "certification" | "membership"; title: string; institution: string; year: string };
const STEP_FIELDS: string[][] = [
  ["name", "email", "phone", "password", "confirmPassword"],
  ["title", "licenseCategory", "licenseNumber", "licenseExpiresOn", "yearsExperience", "credentials"],
  ["specializationIds", "languages", "bio", "terms"],
];

function PsychologistForm({ specializations, languages }: { specializations: Spec[]; languages: string[] }) {
  const [state, action] = useActionState(signUpPsychologist, {} as FormState);
  const tz = useBrowserTimezone();
  const [step, setStep] = useState(0);
  const [creds, setCreds] = useState<Credential[]>(() => {
    try {
      const saved = JSON.parse(state.values?.credentials ?? "[]");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return [{ kind: "degree", title: "", institution: "", year: "" }];
  });
  const [bio, setBio] = useState("");
  const stepRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  const savedSpecs = (v.specializationIds ?? "").split(",");
  const savedLangs = v.languages ? v.languages.split(",") : ["English"];

  // When a new server response reports errors, jump to the first step that has one (adjusting state during render).
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    const first = STEP_FIELDS.findIndex((fields) => fields.some((f) => state.errors?.[f]));
    if (first >= 0) setStep(first);
  }

  const next = () => {
    const fs = stepRefs.current[step];
    const invalid = fs ? Array.from(fs.querySelectorAll<HTMLInputElement>("input,select,textarea")).find((el) => !el.checkValidity()) : null;
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setStep((s) => s + 1);
  };

  const steps = ["Account", "Credentials", "Practice"];
  const credsJson = JSON.stringify(creds.filter((c) => c.title.trim()).map((c) => ({ ...c, year: c.year || undefined, institution: c.institution || undefined })));

  return (
    <form action={action} className="grid gap-5" style={{ animation: "fade .3s" }}>
      <input type="hidden" name="timezone" value={tz} />
      <input type="hidden" name="credentials" value={credsJson} />
      <ol className="flex gap-2" aria-label="Application steps">
        {steps.map((s, i) => (
          <li key={s} className="flex-1" aria-current={i === step ? "step" : undefined}>
            <div className={`h-2.5 rounded-full border-2 border-ink ${i <= step ? "bg-mint" : "bg-white"}`} />
            <span className={`mt-1 block text-xs font-bold uppercase tracking-[.08em] ${i === step ? "text-ink" : "text-ink-2/60"}`}>
              {i + 1}. {s}
            </span>
          </li>
        ))}
      </ol>
      <FormMessage message={state.message} />

      <fieldset ref={(el) => void (stepRefs.current[0] = el)} hidden={step !== 0} className="grid gap-4">
        <legend className="sr-only">Account</legend>
        <Field label="Full name" name="name" required minLength={2} maxLength={100} autoComplete="name" defaultValue={v.name} error={e.name} />
        <Field label="Professional email" name="email" type="email" required autoComplete="email" defaultValue={v.email} error={e.email} />
        <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" placeholder="+233 24 123 4567" defaultValue={v.phone} error={e.phone} />
        <PasswordField name="password" autoComplete="new-password" showStrength error={e.password} />
        <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" error={e.confirmPassword} />
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[1] = el)} hidden={step !== 1} className="grid gap-4">
        <legend className="sr-only">Credentials</legend>
        <Field label="Professional title" name="title" required placeholder="e.g. Clinical Psychologist" defaultValue={v.title} error={e.title} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Register category" name="licenseCategory" defaultValue={v.licenseCategory || LICENSE_CATEGORIES[0]} error={e.licenseCategory}>
            {LICENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <Field label="Years of experience" name="yearsExperience" type="number" min={0} max={70} required defaultValue={v.yearsExperience} error={e.yearsExperience} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GPC registration no." name="licenseNumber" required minLength={3} maxLength={60} defaultValue={v.licenseNumber} error={e.licenseNumber} hint="Ghana Psychological Council" />
          <Field label="Licence valid until" name="licenseExpiresOn" type="date" optional defaultValue={v.licenseExpiresOn} error={e.licenseExpiresOn} />
        </div>

        <div className="grid gap-3">
          <span className="text-[.88rem] font-bold">Qualifications</span>
          {creds.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border-2 border-ink/80 bg-white p-3 sm:grid-cols-[110px_1fr]">
              <select
                aria-label={`Qualification ${i + 1} type`}
                className="rounded-xl border-2 border-ink bg-cream px-2 py-2 text-sm"
                value={c.kind}
                onChange={(ev) => setCreds((all) => all.map((x, j) => (j === i ? { ...x, kind: ev.target.value as Credential["kind"] } : x)))}
              >
                <option value="degree">Degree</option>
                <option value="license">Licence</option>
                <option value="certification">Certificate</option>
                <option value="membership">Membership</option>
              </select>
              <input
                aria-label={`Qualification ${i + 1} title`}
                required={i === 0}
                placeholder="e.g. MPhil Clinical Psychology"
                className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-sm"
                value={c.title}
                onChange={(ev) => setCreds((all) => all.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))}
              />
              <input
                aria-label={`Qualification ${i + 1} institution`}
                placeholder="Institution"
                className="rounded-xl border-2 border-ink bg-cream px-3 py-2 text-sm sm:col-start-2"
                value={c.institution}
                onChange={(ev) => setCreds((all) => all.map((x, j) => (j === i ? { ...x, institution: ev.target.value } : x)))}
              />
              <div className="flex gap-2 sm:col-start-2">
                <input
                  aria-label={`Qualification ${i + 1} year`}
                  inputMode="numeric"
                  placeholder="Year"
                  className="w-24 rounded-xl border-2 border-ink bg-cream px-3 py-2 text-sm"
                  value={c.year}
                  onChange={(ev) => setCreds((all) => all.map((x, j) => (j === i ? { ...x, year: ev.target.value.replace(/\D/g, "").slice(0, 4) } : x)))}
                />
                {creds.length > 1 && (
                  <button type="button" onClick={() => setCreds((all) => all.filter((_, j) => j !== i))} className="ml-auto text-sm font-semibold text-ink-2 underline">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          {creds.length < 15 && (
            <button type="button" onClick={() => setCreds((all) => [...all, { kind: "certification", title: "", institution: "", year: "" }])} className="btn btn-white btn-sm w-fit">
              + Add another
            </button>
          )}
          <FieldError error={e.credentials} />
        </div>
      </fieldset>

      <fieldset ref={(el) => void (stepRefs.current[2] = el)} hidden={step !== 2} className="grid gap-4">
        <legend className="sr-only">Practice</legend>
        <div>
          <span className="mb-2 block text-[.88rem] font-bold">Areas of specialisation</span>
          <div className="flex flex-wrap gap-2">
            {specializations.map((s) => (
              <label key={s.id} className="chip-check">
                <input type="checkbox" name="specializationIds" value={s.id} defaultChecked={savedSpecs.includes(s.id)} />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
          <FieldError error={e.specializationIds} />
        </div>
        <div>
          <span className="mb-2 block text-[.88rem] font-bold">Languages you consult in</span>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <label key={l} className="chip-check">
                <input type="checkbox" name="languages" value={l} defaultChecked={savedLangs.includes(l)} />
                <span>{l}</span>
              </label>
            ))}
          </div>
          <FieldError error={e.languages} />
        </div>
        <TextArea
          label="Short professional biography"
          name="bio"
          required
          minLength={80}
          maxLength={2000}
          defaultValue={v.bio}
          onChange={(ev) => setBio(ev.target.value)}
          error={e.bio}
          hint={`${bio.length}/2000 · at least 80 characters. Clients read this first, so say who you work with and how.`}
        />
        <p className="rounded-2xl border-2 border-ink bg-sun-soft px-4 py-3 text-sm">
          Our team reviews every application against the GPC register before your profile is listed. You can set up your services and availability while you wait.
        </p>
        <Terms error={e.terms} />
      </fieldset>

      <div className="flex justify-between gap-3">
        <button type="button" onClick={() => setStep((s) => s - 1)} className={`btn btn-white ${step === 0 ? "invisible" : ""}`}>
          ← Back
        </button>
        {step < 2 ? (
          <button type="button" onClick={next} className="btn btn-primary">
            Continue <Icon name="arrow" strokeWidth={2.5} />
          </button>
        ) : (
          <SubmitButton pendingLabel="Submitting…">Submit application</SubmitButton>
        )}
      </div>
    </form>
  );
}
