export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-32 animate-pulse rounded-full bg-ink/10" />
      <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-ink/10" />
      <div className="mt-4 h-14 animate-pulse rounded-2xl bg-ink/10" />
      <div className="h-14 animate-pulse rounded-2xl bg-ink/10" />
      <div className="h-14 animate-pulse rounded-full bg-ink/10" />
    </div>
  );
}
