import { Skeleton } from "@/components/app/ui";

export default function Loading() {
  return (
    <div className="wrap grid gap-5 pb-16 pt-[140px]" aria-busy="true" aria-label="Loading psychologists">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-6 w-1/2" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48" />
      ))}
    </div>
  );
}
