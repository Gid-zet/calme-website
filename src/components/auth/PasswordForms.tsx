"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptInvite, requestPasswordReset, resendVerification, resetPassword } from "@/app/(auth)/actions";
import type { FormState } from "@/lib/validation";
import { Field, FormMessage, PasswordField, SubmitButton } from "../forms/Field";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, {} as FormState);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage message={state.message} ok={state.ok} />
      {!state.ok && (
        <>
          <Field label="Email address" name="email" type="email" required autoComplete="email" defaultValue={state.values?.email} error={state.errors?.email} />
          <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
        </>
      )}
      <Link href="/sign-in" className="text-center text-sm font-bold text-blue underline underline-offset-4">
        Back to sign in
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, {} as FormState);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage message={state.message} />
      <input type="hidden" name="token" value={token} />
      <PasswordField name="password" label="New password" autoComplete="new-password" showStrength error={state.errors?.password} />
      <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" error={state.errors?.confirmPassword} />
      <SubmitButton pendingLabel="Saving…">Set new password</SubmitButton>
      <p className="text-center text-sm text-ink-2">For your security, this signs you out on all devices.</p>
    </form>
  );
}

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInvite, {} as FormState);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage message={state.message} />
      <input type="hidden" name="token" value={token} />
      <PasswordField name="password" label="Choose a password" autoComplete="new-password" showStrength error={state.errors?.password} />
      <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" error={state.errors?.confirmPassword} />
      <SubmitButton pendingLabel="Activating…">Activate admin account</SubmitButton>
    </form>
  );
}

export function ResendVerificationButton({ className = "btn btn-white btn-sm" }: { className?: string }) {
  const [state, action] = useActionState(resendVerification, {} as FormState);
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-3">
      <SubmitButton className={className} pendingLabel="Sending…">
        Resend confirmation email
      </SubmitButton>
      {state.message && (
        <span role="status" className="text-sm font-semibold">
          {state.message}
        </span>
      )}
    </form>
  );
}
