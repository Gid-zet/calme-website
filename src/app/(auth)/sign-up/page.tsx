import type { Metadata } from "next";
import { connection } from "next/server";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { getActiveSpecializations, LANGUAGES } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  await connection(); // the specialisation list comes from the database at request time
  const [sp, specs] = await Promise.all([searchParams, getActiveSpecializations()]);
  return <SignUpForm initialRole={sp.role === "psychologist" ? "psychologist" : "client"} specializations={specs} languages={LANGUAGES} />;
}

// Reads the URL (redirect target / role / status), so it renders at request time.
export const instant = false;
