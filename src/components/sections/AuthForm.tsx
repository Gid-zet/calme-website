"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "../ui/Icon";

const roles: { key: string; icon: IconName; title: string; body: string; bg: string }[] = [
  { key: "user", icon: "user", title: "I'm looking for support", body: "Book sessions & track your wellbeing", bg: "var(--sun-soft)" },
  { key: "psychologist", icon: "stethoscope", title: "I'm a psychologist", body: "Manage clients, sessions & availability", bg: "var(--mint-soft)" },
];

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [role, setRole] = useState("user");
  const [show, setShow] = useState(false);
  const signUp = mode === "sign-up";

  return (
    <div style={{ animation: "fade .4s" }}>
      <span className="hand text-2xl text-blue">{signUp ? "hello there ✿" : "welcome back ✿"}</span>
      <h1 className="mb-2 mt-1 text-[clamp(2.2rem,5vw,3rem)]">{signUp ? "Create your account" : "Sign in to CalMe"}</h1>
      <p className="mb-8 text-ink-2">
        {signUp ? "Already have an account? " : "New to CalMe? "}
        <Link href={signUp ? "/sign-in" : "/sign-up"} className="font-bold text-blue underline underline-offset-4">
          {signUp ? "Sign in" : "Create an account"}
        </Link>
      </p>

      {/* TODO: connect to auth provider */}
      <form onSubmit={(e) => e.preventDefault()} className="grid gap-4">
        {signUp && (
          <fieldset className="mb-2 grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-bold">I am joining as…</legend>
            {roles.map((r) => (
              <label
                key={r.key}
                className={`cursor-pointer rounded-[18px] border-[2.5px] border-ink p-4 transition ${role === r.key ? "shadow-[4px_4px_0_var(--blue)] ring-2 ring-blue" : "shadow-[3px_3px_0_var(--line)]"}`}
                style={{ background: r.bg }}
              >
                <input type="radio" name="role" value={r.key} checked={role === r.key} onChange={() => setRole(r.key)} className="sr-only" />
                <span className="mb-2 grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-white">
                  <Icon name={r.icon} className="h-5 w-5" />
                </span>
                <b className="block text-[.95rem] leading-tight">{r.title}</b>
                <span className="text-xs text-ink-2">{r.body}</span>
              </label>
            ))}
          </fieldset>
        )}

        {signUp && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" required autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" placeholder="you@email.com" />
        </div>
        <div className="field">
          <div className="flex items-center justify-between">
            <label htmlFor="password">Password</label>
            {!signUp && (
              <Link href="#" className="text-sm font-semibold text-blue">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input id="password" type={show ? "text" : "password"} required autoComplete={signUp ? "new-password" : "current-password"} className="!pr-12" />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink">
              <Icon name="eye" className="h-5 w-5" />
            </button>
          </div>
        </div>
        {signUp && role === "psychologist" && (
          <div className="field" style={{ animation: "fade .3s" }}>
            <label htmlFor="license">License / registration number</label>
            <input id="license" required placeholder="We'll verify this before activating your account" />
          </div>
        )}
        {signUp && (
          <label className="flex items-start gap-2.5 text-sm text-ink-2">
            <input type="checkbox" required className="mt-1 h-4 w-4 accent-[var(--blue)]" />
            <span>
              I agree to the <Link href="/terms-of-service" className="font-semibold text-ink underline">Terms</Link> and{" "}
              <Link href="/privacy-policy" className="font-semibold text-ink underline">Privacy Policy</Link>.
            </span>
          </label>
        )}
        <button type="submit" className="btn btn-primary mt-2 justify-center">
          {signUp ? "Create account" : "Sign in"} <Icon name="arrow" strokeWidth={2.5} />
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-sm font-semibold text-ink-2">
        <span className="h-px flex-1 bg-ink/20" /> or <span className="h-px flex-1 bg-ink/20" />
      </div>
      <button className="btn btn-white w-full justify-center">
        <svg viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.9A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.8 14c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7H2.1a11 11 0 0 0 0 9.9z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
