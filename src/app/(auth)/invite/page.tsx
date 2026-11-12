import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInviteForm } from "@/components/auth/PasswordForms";
import { peekToken } from "@/lib/server/tokens";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ searchParams }: PageProps<"/invite">) {
  const { token } = await searchParams;
  const invite = typeof token === "string" ? await peekToken(token, "admin_invite") : null;
  if (!invite || typeof token !== "string") {
    return (
      <div className="grid gap-4">
        <h1 className="text-[clamp(2.2rem,5vw,3rem)]">Invitation not valid</h1>
        <p className="text-ink-2">This invitation is invalid, already used, or has expired. Ask a CalMe administrator to send a new one.</p>
        <Link href="/sign-in" className="btn btn-white justify-center">Go to sign in</Link>
      </div>
    );
  }
  return (
    <div style={{ animation: "fade .4s" }}>
      <span className="hand text-2xl text-blue">welcome to the team ✿</span>
      <h1 className="mb-2 mt-1 text-[clamp(2.2rem,5vw,3rem)]">Activate your admin account</h1>
      <p className="mb-8 text-ink-2">
        Hi {invite.name}, set a password for <b>{invite.email}</b> to finish joining CalMe as an administrator.
      </p>
      <AcceptInviteForm token={token} />
    </div>
  );
}

// One-time links: always checked against the database at request time.
export const instant = false;
