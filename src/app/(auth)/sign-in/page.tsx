import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  reset: "Your password has been changed. Sign in with your new password.",
  signedOut: "You've been signed out.",
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice = Object.keys(NOTICES).find((k) => sp[k] !== undefined);
  return <SignInForm next={next} notice={notice ? NOTICES[notice] : undefined} />;
}

// Reads the URL (redirect target / role / status), so it renders at request time.
export const instant = false;
