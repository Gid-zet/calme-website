"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/** Up to 3 psychologists picked for side-by-side comparison, kept in sessionStorage. */
const KEY = "calme.compare";
type Item = { id: string; name: string };
const listeners = new Set<() => void>();
let cache: Item[] | null = null;

function read(): Item[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function write(items: Item[]) {
  cache = items;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  listeners.forEach((l) => l());
}
const EMPTY: Item[] = [];
function useCompare() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => EMPTY,
  );
}

export function CompareToggle({ id, name }: { id: string; name: string }) {
  const items = useCompare();
  const on = items.some((i) => i.id === id);
  const full = items.length >= 3 && !on;
  return (
    <label className={`chip-check ${full ? "opacity-50" : ""}`} title={full ? "You can compare up to 3 psychologists" : undefined}>
      <input type="checkbox" checked={on} disabled={full} onChange={() => write(on ? items.filter((i) => i.id !== id) : [...items, { id, name }])} />
      <span>Compare</span>
    </label>
  );
}

export function CompareTray() {
  const items = useCompare();
  if (items.length === 0) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-3xl border-[2.5px] border-ink bg-white p-3 shadow-[6px_6px_0_var(--line)]" role="region" aria-label="Compare psychologists">
      <span className="px-2 text-sm font-bold">Compare ({items.length}/3):</span>
      <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{items.map((i) => i.name).join(" · ")}</span>
      <button onClick={() => write([])} className="text-sm font-semibold underline">
        Clear
      </button>
      <Link
        href={`/psychologists/compare?ids=${items.map((i) => i.id).join(",")}`}
        aria-disabled={items.length < 2}
        className={`btn btn-primary btn-sm ${items.length < 2 ? "pointer-events-none opacity-50" : ""}`}
      >
        Compare now
      </Link>
    </div>
  );
}
