import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/PasswordForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div style={{ animation: "fade .4s" }}>
      <span className="hand text-2xl text-blue">it happens ✿</span>
      <h1 className="mb-2 mt-1 text-[clamp(2.2rem,5vw,3rem)]">Forgot your password?</h1>
      <p className="mb-8 text-ink-2">Enter the email you signed up with and we&apos;ll send you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </div>
  );
}
