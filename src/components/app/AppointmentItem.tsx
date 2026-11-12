import Link from "next/link";
import { formatDate, formatTime, MODE_LABEL } from "@/lib/format";
import type { AppointmentRow } from "@/lib/server/appointments-query";
import { Avatar, StatusBadge } from "./ui";

/** One appointment row; `perspective` decides whose name and which link to show. */
export function AppointmentItem({ a, tz, perspective }: { a: AppointmentRow; tz: string; perspective: "client" | "psychologist" }) {
  const other = perspective === "client" ? { name: a.psychologistName, avatar: a.psychologistAvatar, sub: a.psychologistTitle } : { name: a.clientName, avatar: a.clientAvatar, sub: "Client" };
  const href = perspective === "client" ? `/dashboard/appointments/${a.id}` : `/practice/appointments/${a.id}`;
  return (
    <li>
      <Link href={href} className="panel flex items-center gap-4 p-3 pr-4 transition-colors hover:bg-[#fffdf8] sm:p-4">
        <div className="hidden w-16 shrink-0 flex-col items-center rounded-2xl border-2 border-ink bg-blue-soft py-1.5 sm:flex">
          <span className="text-[.65rem] font-bold uppercase">{formatDate(a.startsAt, tz, { weekday: "short", day: undefined, month: undefined, year: undefined })}</span>
          <span className="font-display text-xl font-bold leading-none">{formatDate(a.startsAt, tz, { weekday: undefined, day: "numeric", month: undefined, year: undefined })}</span>
          <span className="text-[.65rem] font-semibold">{formatDate(a.startsAt, tz, { weekday: undefined, day: undefined, month: "short", year: undefined })}</span>
        </div>
        <Avatar name={other.name} fileId={other.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <b className="block truncate">{other.name}</b>
          <span className="block truncate text-sm text-ink-2">
            <span className="sm:hidden">{formatDate(a.startsAt, tz, { year: undefined })} · </span>
            {formatTime(a.startsAt, tz)} · {a.serviceName} · {MODE_LABEL[a.mode]}
          </span>
        </div>
        <StatusBadge status={a.status} />
      </Link>
    </li>
  );
}
