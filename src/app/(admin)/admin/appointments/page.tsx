import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Pagination, StatusBadge } from "@/components/app/ui";
import { appointmentStatusEnum, type AppointmentStatus } from "@/db/schema";
import { formatDateTime, formatMoney, MODE_LABEL, STATUS_META } from "@/lib/format";
import { listAppointments, maskName, psychologistOptions } from "@/lib/server/admin";
import { requireRole } from "@/lib/server/auth";
import { isLocalDate, zonedToUtc, addDays } from "@/lib/scheduling/time";

export const metadata: Metadata = { title: "Appointments" };

const s = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);

export default async function AdminAppointments({ searchParams }: PageProps<"/admin/appointments">) {
  const admin = await requireRole("admin", "/admin/appointments");
  const sp = await searchParams;
  const tz = admin.timezone;
  const status = (appointmentStatusEnum.enumValues as readonly string[]).includes(s(sp.status) ?? "") ? (s(sp.status) as AppointmentStatus) : undefined;
  const fromDate = s(sp.from) && isLocalDate(s(sp.from)!) ? s(sp.from) : undefined;
  const toDate = s(sp.to) && isLocalDate(s(sp.to)!) ? s(sp.to) : undefined;
  const psychologistId = s(sp.psychologist) && /^[0-9a-f-]{36}$/i.test(s(sp.psychologist)!) ? s(sp.psychologist) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const upcoming = sp.scope === "upcoming";
  const f = {
    psychologistId,
    client: s(sp.client),
    status,
    from: fromDate ? zonedToUtc(fromDate, 0, tz) : upcoming ? new Date() : undefined,
    to: toDate ? zonedToUtc(addDays(toDate, 1), 0, tz) : undefined,
    page,
  };
  const [{ rows, total, pageCount }, psychs] = await Promise.all([listAppointments(f), psychologistOptions()]);
  const qs = (p: number) =>
    `/admin/appointments?${new URLSearchParams(
      Object.entries({ psychologist: psychologistId, client: f.client, status, from: fromDate, to: toDate, scope: upcoming ? "upcoming" : undefined, page: String(p) }).filter((e): e is [string, string] => Boolean(e[1])),
    )}`;

  return (
    <>
      <PageHeader title="Appointments" description={`${total} appointment${total === 1 ? "" : "s"} match. Client names are abbreviated in lists; open an appointment to see full details (logged).`} />
      <form className="mb-4 grid gap-2 rounded-[20px] border-2 border-ink bg-white p-4 sm:grid-cols-2 lg:grid-cols-6" aria-label="Filters">
        <div className="field lg:col-span-2">
          <label htmlFor="psychologist">Psychologist</label>
          <select id="psychologist" name="psychologist" defaultValue={psychologistId ?? ""} className="!py-2">
            <option value="">All psychologists</option>
            {psychs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="client">Client name or email</label>
          <input id="client" name="client" defaultValue={f.client} className="!py-2" />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="!py-2">
            <option value="">Any</option>
            {appointmentStatusEnum.enumValues.map((v) => (
              <option key={v} value={v}>
                {STATUS_META[v].short}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={fromDate} className="!py-2" />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={toDate} className="!py-2" />
        </div>
        <div className="flex gap-2 lg:col-span-6">
          <button className="btn btn-primary btn-sm">Apply</button>
          <Link href="/admin/appointments" className="btn btn-white btn-sm">
            Reset
          </Link>
        </div>
      </form>
      {rows.length ? (
        <div className="overflow-x-auto rounded-[20px] border-2 border-ink bg-white">
          <table className="tbl min-w-[860px]">
            <thead>
              <tr>
                <th>When</th>
                <th>Psychologist</th>
                <th>Client</th>
                <th>Session</th>
                <th>Status</th>
                <th>Booked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/appointments/${a.id}`} className="font-semibold hover:underline">
                      {formatDateTime(a.startsAt, tz)}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/admin/psychologists/${a.psychologistId}`} className="hover:underline">
                      {a.psychologistName}
                    </Link>
                  </td>
                  <td>{maskName(a.clientName)}</td>
                  <td>
                    {a.serviceName}
                    <span className="block text-xs text-ink-2">
                      {MODE_LABEL[a.mode]} · {formatMoney(a.priceMinor)}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                    {a.lateCancellation && <span className="badge ml-1 bg-sun-soft">late</span>}
                  </td>
                  <td className="text-xs">{formatDateTime(a.createdAt, tz)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="🗓️" title="No appointments match these filters" />
      )}
      <Pagination page={page} pageCount={pageCount} makeHref={qs} />
    </>
  );
}
