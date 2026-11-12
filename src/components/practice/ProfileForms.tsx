"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { addCredential, removeCredential, updateProfile, uploadAvatar } from "@/app/practice-actions";
import type { FormState } from "@/lib/validation";
import { Avatar } from "../app/ui";
import { Field, FieldError, FormMessage, SelectField, SubmitButton, TextArea } from "../forms/Field";

type Spec = { id: string; name: string };

export function PhotoForm({ name, fileId }: { name: string; fileId: string | null }) {
  const [state, action] = useActionState(uploadAvatar, {} as FormState);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <form action={action} className="panel flex flex-wrap items-center gap-5 p-5">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-24 w-24 rounded-[22px] border-2 border-ink object-cover" />
      ) : (
        <Avatar name={name} fileId={fileId} size={96} className="!rounded-[22px]" />
      )}
      <div className="grid gap-2">
        <b>Profile photograph</b>
        <p className="text-sm text-ink-2">A clear, friendly head-and-shoulders photo. JPG, PNG or WebP, up to 2 MB.</p>
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Choose a photo"
          className="text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        <FieldError error={state.errors?.photo} />
        <FormMessage message={state.message} ok={state.ok} />
        <SubmitButton className="btn btn-primary btn-sm w-fit" pendingLabel="Uploading…">
          Upload photo
        </SubmitButton>
      </div>
    </form>
  );
}

export function ProfileForm({
  defaults,
  specializations,
  languages,
}: {
  defaults: { title: string; bio: string; yearsExperience: number; location: string; languages: string[]; specializationIds: string[]; licenseExpiresOn: string };
  specializations: Spec[];
  languages: string[];
}) {
  const [state, action] = useActionState(updateProfile, {} as FormState);
  const e = state.errors ?? {};
  return (
    <form action={action} className="panel grid gap-4 p-5">
      <h2 className="!text-xl">Professional details</h2>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Professional title" name="title" required defaultValue={defaults.title} error={e.title} />
        <Field label="Years of experience" name="yearsExperience" type="number" min={0} max={70} required defaultValue={defaults.yearsExperience} error={e.yearsExperience} />
        <Field label="Practice location" name="location" optional placeholder="e.g. Osu, Accra" defaultValue={defaults.location} error={e.location} hint="Shown for in-person sessions." />
        <Field label="Licence valid until" name="licenseExpiresOn" type="date" optional defaultValue={defaults.licenseExpiresOn} error={e.licenseExpiresOn} />
      </div>
      <TextArea label="Biography" name="bio" required minLength={80} maxLength={2000} defaultValue={defaults.bio} error={e.bio} hint="Who you work with, your approach, and what a first session looks like." />
      <div>
        <span className="mb-2 block text-[.88rem] font-bold">Specialisations</span>
        <div className="flex flex-wrap gap-2">
          {specializations.map((s) => (
            <label key={s.id} className="chip-check">
              <input type="checkbox" name="specializationIds" value={s.id} defaultChecked={defaults.specializationIds.includes(s.id)} />
              <span>{s.name}</span>
            </label>
          ))}
        </div>
        <FieldError error={e.specializationIds} />
      </div>
      <div>
        <span className="mb-2 block text-[.88rem] font-bold">Languages</span>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => (
            <label key={l} className="chip-check">
              <input type="checkbox" name="languages" value={l} defaultChecked={defaults.languages.includes(l)} />
              <span>{l}</span>
            </label>
          ))}
        </div>
        <FieldError error={e.languages} />
      </div>
      <SubmitButton className="btn btn-primary btn-sm w-fit" pendingLabel="Saving…">
        Save profile
      </SubmitButton>
    </form>
  );
}

type Cred = { id: string; kind: string; title: string; institution: string | null; year: number | null; documentFileId: string | null; docName: string | null };

export function CredentialsManager({ credentials }: { credentials: Cred[] }) {
  const router = useRouter();
  const [state, action] = useActionState(addCredential, {} as FormState);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="panel grid gap-4 p-5" aria-labelledby="creds">
      <div>
        <h2 id="creds" className="!text-xl">
          Qualifications &amp; documents
        </h2>
        <p className="text-sm text-ink-2">Titles appear on your public profile. Uploaded documents are private: only you and CalMe&apos;s verification team can open them.</p>
      </div>
      {msg && <p className="text-sm font-semibold">{msg}</p>}
      <ul className="grid gap-2">
        {credentials.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-ink/80 px-3 py-2">
            <span>
              <b>{c.title}</b>
              <span className="block text-sm text-ink-2">
                {[c.kind, c.institution, c.year].filter(Boolean).join(" · ")}
                {c.documentFileId && (
                  <>
                    {" · "}
                    <a href={`/api/files/${c.documentFileId}`} target="_blank" rel="noreferrer" className="font-semibold underline">
                      {c.docName ?? "document"}
                    </a>
                  </>
                )}
              </span>
            </span>
            <button
              className="text-sm font-semibold underline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await removeCredential(c.id);
                  setMsg(r.ok ? (r.message ?? null) : r.error);
                  router.refresh();
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form action={action} className="grid gap-3 rounded-2xl border-2 border-dashed border-ink/40 p-4">
        <b className="text-sm">Add a qualification</b>
        <FormMessage message={state.message} ok={state.ok} />
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <SelectField label="Type" name="kind" defaultValue="certification">
            <option value="degree">Degree</option>
            <option value="license">Licence</option>
            <option value="certification">Certificate</option>
            <option value="membership">Membership</option>
          </SelectField>
          <Field label="Title" name="title" required error={state.errors?.title} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <Field label="Institution" name="institution" optional error={state.errors?.institution} />
          <Field label="Year" name="year" inputMode="numeric" optional error={state.errors?.year} />
        </div>
        <div className="field">
          <label htmlFor="document">
            Supporting document <span className="font-medium text-ink-2">(optional, PDF/JPG/PNG up to 5 MB)</span>
          </label>
          <input id="document" type="file" name="document" accept="application/pdf,image/jpeg,image/png" className="!bg-white text-sm" />
          <FieldError error={state.errors?.document} />
        </div>
        <SubmitButton className="btn btn-white btn-sm w-fit" pendingLabel="Adding…">
          Add qualification
        </SubmitButton>
      </form>
    </section>
  );
}
