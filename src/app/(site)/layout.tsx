import Link from "next/link";
import { Suspense } from "react";
import { Footer } from "@/components/site/Footer";
import { Logo } from "@/components/site/Logo";
import { Navbar } from "@/components/site/Navbar";
import { HOME_FOR_ROLE } from "@/lib/server/auth";
import { getSessionUser } from "@/lib/server/session";

const LABEL = { client: "My dashboard", psychologist: "My practice", admin: "Admin console" } as const;

async function AccountLink({ mobile }: { mobile?: boolean }) {
  const user = await getSessionUser();
  const cls = mobile ? "block rounded-2xl px-4 py-3 text-lg font-bold hover:bg-sun-soft" : "rounded-full px-3.5 py-2 text-[.95rem] font-semibold hover:bg-sun-soft";
  return user ? (
    <Link href={HOME_FOR_ROLE[user.role]} className={cls}>
      {LABEL[user.role]}
    </Link>
  ) : (
    <Link href="/sign-in" className={cls}>
      Sign in
    </Link>
  );
}

function NavbarFallback() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-3.5 z-50" aria-hidden>
      <div className="wrap flex h-[60px] items-center rounded-full border-2 border-ink bg-white/85 pl-4 shadow-[4px_4px_0_var(--line)] backdrop-blur-md">
        <Logo />
      </div>
    </header>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The navbar reads the current path, which on dynamic routes is only known at request time. */}
      <Suspense fallback={<NavbarFallback />}>
        <Navbar
          account={
            <Suspense fallback={<span className="inline-block w-[84px]" />}>
              <AccountLink />
            </Suspense>
          }
          mobileAccount={
            <Suspense fallback={null}>
              <AccountLink mobile />
            </Suspense>
          }
        />
      </Suspense>
      <main>{children}</main>
      <Footer />
    </>
  );
}
