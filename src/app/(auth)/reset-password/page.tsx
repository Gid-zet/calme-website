import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/PasswordForms";
import { peekToken } from "@/lib/server/tokens";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const valid = typeof token === "string" ? await peekToken(token, "reset_password") : null;
  return (
    <div style={{ animation: "fade .4s" }}>
      <h1 className="mb-2 mt-1 text-[clamp(2.2rem,5vw,3rem)]">Choose a new password</h1>
      {valid && typeof token === "string" ? (
        <>
          <p className="mb-8 text-ink-2">Resetting the password for the account linked to this email.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <div className="grid gap-4">
          <p className="rounded-2xl border-2 border-ink bg-coral-soft px-4 py-3 font-semibold">This reset link is invalid, already used, or has expired.</p>
          <Link href="/forgot-password" className="btn btn-primary justify-center">
            Request a new link
          </Link>
        </div>
      )}
    </div>
  );
}
