"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/(auth)/actions";
import { Field, FormMessage, PasswordField, SubmitButton } from "../forms/Field";
import { Icon } from "../ui/Icon";

export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <div style={{ animation: "fade .4s" }}>
      <span className="hand text-2xl text-blue">welcome back ✿</span>
      <h1 className="mb-2 mt-1 text-[clamp(2.2rem,5vw,3rem)]">Sign in to CalMe</h1>
      <p className="mb-8 text-ink-2">
        New to CalMe?{" "}
        <Link href="/sign-up" className="font-bold text-blue underline underline-offset-4">
          Create an account
        </Link>
      </p>

      <form action={action} className="grid gap-4" noValidate>
        {notice && <FormMessage ok message={notice} />}
        <FormMessage message={state.message} />
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email address" name="email" type="email" required autoComplete="email" placeholder="you@email.com" defaultValue={state.values?.email} error={state.errors?.email} />
        <PasswordField
          error={state.errors?.password}
          extra={
            <Link href="/forgot-password" className="text-sm font-semibold text-blue">
              Forgot password?
            </Link>
          }
        />
        <SubmitButton className="btn btn-primary mt-2" pendingLabel="Signing in…">
          Sign in <Icon name="arrow" strokeWidth={2.5} />
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        CalMe administrators sign in here too. Admin accounts are created by invitation only.
      </p>
    </div>
  );
}
