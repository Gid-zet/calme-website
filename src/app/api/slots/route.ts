import { and, eq, or } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { appointments } from "@/db/schema";
import { getSlotsForService } from "@/lib/server/booking";
import { rateLimit } from "@/lib/server/rate-limit";
import { getSessionUser } from "@/lib/server/session";

/**
 * GET /api/slots?serviceId=…&from=ISO&days=7[&exclude=appointmentId]
 * Returns open start times only (never who booked what). `exclude` is for rescheduling and is
 * honoured only for a participant of that appointment.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const serviceId = p.get("serviceId") ?? "";
  const from = new Date(p.get("from") ?? Date.now());
  const days = Math.min(31, Math.max(1, Number(p.get("days") ?? 7) || 7));
  if (!/^[0-9a-f-]{36}$/i.test(serviceId) || Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimit(`slots:${ip}`, 240, 60)).ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let exclude: string | undefined;
  let ignoreNotice = false;
  const ex = p.get("exclude");
  if (ex && /^[0-9a-f-]{36}$/i.test(ex)) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const db = await getDb();
    const [a] = await db
      .select({ id: appointments.id, psychologistId: appointments.psychologistId })
      .from(appointments)
      .where(and(eq(appointments.id, ex), or(eq(appointments.clientId, user.id), eq(appointments.psychologistId, user.id))))
      .limit(1);
    if (!a) return NextResponse.json({ error: "Not found." }, { status: 404 });
    exclude = a.id;
    ignoreNotice = a.psychologistId === user.id; // psychologists may move sessions inside their own notice period
  }

  const start = from < new Date() ? new Date() : from;
  const to = new Date(start.getTime() + days * 86400_000);
  const { service, slots, timeZone } = await getSlotsForService(serviceId, start, to, { excludeAppointmentId: exclude, ignoreNotice });
  if (!service) return NextResponse.json({ error: "Service not found." }, { status: 404 });
  return NextResponse.json(
    { slots: slots.map((s) => s.toISOString()), psychologistTimeZone: timeZone, durationMinutes: service.durationMinutes },
    { headers: { "Cache-Control": "no-store" } },
  );
}
