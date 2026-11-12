"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "../site/Logo";
import { Icon, type IconName } from "../ui/Icon";
import { Avatar } from "./ui";

type ShellUser = { name: string; email: string; avatarFileId: string | null };

/** Open/closed state for menus that closes itself whenever the route changes. */
function useMenuState() {
  const pathname = usePathname();
  const [state, setState] = useState({ open: false, path: pathname });
  const open = state.open && state.path === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setState({ open: typeof v === "function" ? v(open) : v, path: pathname });
  return [open, setOpen] as const;
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function Bell({ href, unread, dark }: { href: string; unread: number; dark?: boolean }) {
  return (
    <Link
      href={href}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className={`relative grid h-10 w-10 place-items-center rounded-full border-2 ${dark ? "border-white/30 hover:bg-white/10" : "border-ink bg-white hover:bg-sun-soft"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-coral px-1 text-[.65rem] font-bold text-ink">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function UserMenu({ user, accountHref, dark }: { user: ShellUser; accountHref: string; dark?: boolean }) {
  const [open, setOpen] = useMenuState();
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-full p-0.5 pr-2">
        <Avatar name={user.name} fileId={user.avatarFileId} size={36} />
        <span className={`hidden max-w-[12ch] truncate text-sm font-semibold sm:block ${dark ? "text-white" : ""}`}>{user.name.split(" ")[0]}</span>
        <span aria-hidden className={dark ? "text-white" : ""}>▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border-2 border-ink bg-white p-2 text-ink shadow-[4px_4px_0_var(--line)]" style={{ animation: "fade .15s" }}>
          <div className="border-b border-ink/10 px-3 pb-2 pt-1">
            <b className="block truncate text-sm">{user.name}</b>
            <span className="block truncate text-xs text-ink-2">{user.email}</span>
          </div>
          <Link role="menuitem" href={accountHref} className="mt-1 block rounded-xl px-3 py-2 text-sm font-semibold hover:bg-sun-soft">
            Account &amp; security
          </Link>
          <form action={signOut}>
            <button role="menuitem" type="submit" className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-coral-soft">
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ───────────── Client: top navigation, discovery-first ───────────── */

const CLIENT_NAV = [
  { href: "/dashboard", label: "Home", exact: true },
  { href: "/psychologists", label: "Find a psychologist" },
  { href: "/dashboard/appointments", label: "My appointments" },
];

export function ClientShellHeader({ user, unread }: { user: ShellUser; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useMenuState();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/90 backdrop-blur-md">
      <div className="wrap flex h-[68px] items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {CLIENT_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(pathname, n.href, n.exact) ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-[.95rem] font-semibold transition-colors hover:bg-sun-soft ${isActive(pathname, n.href, n.exact) ? "bg-sun" : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Bell href="/dashboard/notifications" unread={unread} />
          <UserMenu user={user} accountHref="/dashboard/account" />
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-sun md:hidden">
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="wrap grid gap-1 pb-4 md:hidden">
          {CLIENT_NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`rounded-2xl px-4 py-3 font-bold ${isActive(pathname, n.href, n.exact) ? "bg-sun" : "hover:bg-sun-soft"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/* ───────────── Psychologist & admin: sidebar workspaces ───────────── */

export type SideItem = { href: string; label: string; icon: IconName; exact?: boolean; badge?: number };
export type SideGroup = { title?: string; items: SideItem[] };

const THEMES = {
  practice: {
    aside: "bg-[#0f3d34] text-white",
    active: "bg-mint text-ink",
    hover: "hover:bg-white/10",
    label: "Practice",
    accent: "var(--mint)",
  },
  admin: {
    aside: "bg-ink text-white",
    active: "bg-lilac text-ink",
    hover: "hover:bg-white/10",
    label: "Admin console",
    accent: "var(--lilac)",
  },
} as const;

export function SidebarShell({
  variant,
  groups,
  user,
  unread,
  topRight,
  children,
}: {
  variant: keyof typeof THEMES;
  groups: SideGroup[];
  user: ShellUser;
  unread: number;
  topRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = THEMES[variant];
  const pathname = usePathname();
  const [open, setOpen] = useMenuState();
  const base = variant === "practice" ? "/practice" : "/admin";

  const nav = (
    <nav aria-label={t.label} className="grid gap-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <p className="mb-1.5 px-3 text-[.68rem] font-bold uppercase tracking-[.14em] text-white/50">{g.title}</p>}
          <ul className="grid gap-0.5">
            {g.items.map((it) => {
              const active = isActive(pathname, it.href, it.exact);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[.92rem] font-semibold transition-colors ${active ? t.active : t.hover}`}
                  >
                    <Icon name={it.icon} className="h-[18px] w-[18px]" />
                    <span className="flex-1">{it.label}</span>
                    {it.badge ? (
                      <span className="rounded-full bg-coral px-2 text-xs font-bold text-ink" aria-label={`${it.badge} pending`}>
                        {it.badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className={`${t.aside} hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-5`}>
        <div className="mb-6 flex items-center gap-2 px-3">
          <span className="rounded-full bg-white px-2 py-1">
            <Logo />
          </span>
        </div>
        <p className="mb-4 px-3 font-hand text-xl" style={{ color: t.accent }}>
          {t.label}
        </p>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className={`${t.aside} absolute inset-y-0 left-0 w-[260px] overflow-y-auto px-3 py-5`} style={{ animation: "fade .15s" }}>
            <p className="mb-4 px-3 font-hand text-2xl" style={{ color: t.accent }}>
              {t.label}
            </p>
            {nav}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b-2 border-ink bg-cream/95 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-white lg:hidden">
              ☰
            </button>
            <div className="lg:hidden">
              <Logo />
            </div>
            <div className="hidden lg:block">{topRight}</div>
          </div>
          <div className="flex items-center gap-2">
            <Bell href={`${base}/notifications`} unread={unread} />
            <UserMenu user={user} accountHref={`${base}/account`} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
