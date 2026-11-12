import Link from "next/link";
import { initials, STATUS_META, VERIFICATION_META } from "@/lib/format";

/* Small, server-safe building blocks shared by the three app areas. */

export function Avatar({ name, fileId, size = 44, className = "" }: { name: string; fileId?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  if (fileId) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/api/files/${fileId}`} alt="" width={size} height={size} className={`shrink-0 rounded-full border-2 border-ink object-cover ${className}`} style={style} />;
  }
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full border-2 border-ink bg-blue-soft font-display font-bold ${className}`} style={style}>
      {initials(name)}
    </span>
  );
}

export function StatusBadge({ status }: { status: keyof typeof STATUS_META }) {
  const m = STATUS_META[status];
  return (
    <span className="badge" style={{ background: m.bg }}>
      {m.short}
    </span>
  );
}

export function VerificationBadge({ status }: { status: keyof typeof VERIFICATION_META }) {
  const m = VERIFICATION_META[status];
  return (
    <span className="badge" style={{ background: m.bg }}>
      {status === "approved" && "✓ "}
      {m.label}
    </span>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[.12em] text-ink-2">{eyebrow}</p>}
        <h1 className="text-[clamp(1.8rem,3.5vw,2.5rem)]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[65ch] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "#fff", href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string; href?: string }) {
  const body = (
    <>
      <span className="text-xs font-bold uppercase tracking-[.1em] text-ink-2">{label}</span>
      <b className="mt-1 block font-display text-[2rem] leading-none">{value}</b>
      {hint && <span className="mt-1.5 block text-xs text-ink-2">{hint}</span>}
    </>
  );
  const cls = "panel block p-4 transition-transform";
  return href ? (
    <Link href={href} className={`${cls} hover:-translate-y-0.5`} style={{ background: tone }}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={{ background: tone }}>
      {body}
    </div>
  );
}

export function EmptyState({ icon = "🌿", title, body, action }: { icon?: string; title: string; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-[20px] border-2 border-dashed border-ink/30 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <b className="mt-2 font-display text-lg">{title}</b>
      {body && <p className="mt-1 max-w-[46ch] text-sm text-ink-2">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="!text-xl font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Pagination({ page, pageCount, makeHref }: { page: number; pageCount: number; makeHref: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-ink-2">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn btn-white btn-sm" href={makeHref(page - 1)}>
            ← Previous
          </Link>
        ) : null}
        {page < pageCount ? (
          <Link className="btn btn-white btn-sm" href={makeHref(page + 1)}>
            Next →
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-ink/10 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid gap-6">
      <Skeleton className="h-10 w-1/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function Stars({ rating, count }: { rating: number | null; count?: number }) {
  if (rating == null) return <span className="text-sm text-ink-2">New on CalMe</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold" aria-label={`Rated ${rating.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}`}>
      <span className="text-[#e3a008]" aria-hidden>
        ★
      </span>
      {rating.toFixed(1)}
      {count != null && <span className="font-normal text-ink-2">({count})</span>}
    </span>
  );
}

/** Shows a one-time success/notice banner driven by a ?query flag. */
export function Flash({ message, tone = "var(--mint-soft)" }: { message?: string | null; tone?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="mb-6 rounded-2xl border-2 border-ink px-4 py-3 font-semibold" style={{ background: tone }}>
      {message}
    </div>
  );
}
