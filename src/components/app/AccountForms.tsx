"use client";

import { useActionState } from "react";
import { changePassword, updateAccount } from "@/app/account-actions";
import type { FormState } from "@/lib/validation";
import { ResendVerificationButton } from "../auth/PasswordForms";
import { Field, FormMessage, PasswordField, SelectField, SubmitButton } from "../forms/Field";

const ZONES = ["Africa/Accra", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Europe/London", "Europe/Berlin", "America/New_York", "America/Toronto", "Asia/Dubai"];

export function AccountForms({
  role,
  defaults,
  emailVerified,
}: {
  role: string;
  defaults: { name: string; phone: string; timezone: string; preferredLanguage: string };
  emailVerified: boolean;
}) {
  const [profile, saveProfile] = useActionState(updateAccount, {} as FormState);
  const [pw, savePw] = useActionState(changePassword, {} as FormState);
  const zones = ZONES.includes(defaults.timezone) ? ZONES : [defaults.timezone, ...ZONES];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={saveProfile} className="panel grid content-start gap-4 p-6">
        <h2 className="!text-xl">Your details</h2>
        <FormMessage message={profile.message} ok={profile.ok} />
        <Field label="Full name" name="name" required defaultValue={defaults.name} error={profile.errors?.name} />
        <Field label="Phone number" name="phone" type="tel" optional={role === "client"} defaultValue={defaults.phone} error={profile.errors?.phone} />
        <SelectField label="Time zone" name="timezone" defaultValue={defaults.timezone} error={profile.errors?.timezone}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </SelectField>
        {role === "client" && <Field label="Preferred language" name="preferredLanguage" optional defaultValue={defaults.preferredLanguage} />}
        {!emailVerified && (
          <div className="rounded-2xl border-2 border-ink bg-sun-soft p-3 text-sm">
            <p className="mb-2 font-semibold">Your email isn&apos;t confirmed yet.</p>
            <ResendVerificationButton />
          </div>
        )}
        <SubmitButton className="btn btn-primary btn-sm w-fit" pendingLabel="Saving…">
          Save changes
        </SubmitButton>
      </form>
      <form action={savePw} className="panel grid content-start gap-4 p-6">
        <h2 className="!text-xl">Change password</h2>
        <FormMessage message={pw.message} ok={pw.ok} />
        <PasswordField name="currentPassword" label="Current password" error={pw.errors?.currentPassword} />
        <PasswordField name="password" label="New password" autoComplete="new-password" showStrength error={pw.errors?.password} />
        <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" error={pw.errors?.confirmPassword} />
        <SubmitButton className="btn btn-primary btn-sm w-fit" pendingLabel="Updating…">
          Update password
        </SubmitButton>
        <p className="text-xs text-ink-2">Changing your password signs you out on your other devices.</p>
      </form>
    </div>
  );
}
