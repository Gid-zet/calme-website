import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { status } = await searchParams;
  return (
    <div className="grid gap-4" style={{ animation: "fade .4s" }}>
      <h1 className="text-[clamp(2.2rem,5vw,3rem)]">{status === "invalid" ? "That link didn't work" : "Check your inbox"}</h1>
      <p className="text-ink-2">
        {status === "invalid"
          ? "The confirmation link is invalid, already used, or has expired. Sign in and request a new one from your dashboard."
          : "We sent you a link to confirm your email address. It expires in 24 hours."}
      </p>
      <Link href="/sign-in" className="btn btn-primary justify-center">
        Go to sign in
      </Link>
    </div>
  );
}
