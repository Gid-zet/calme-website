/**
 * Seeds reference data (specialisations, platform settings). Safe to re-run.
 *
 *   npm run db:seed            → reference data only (use this in production)
 *   npm run db:seed -- --demo  → also creates demo accounts for local testing
 *
 * Demo account emails and their generated password are written to .data/demo-accounts.md (git-ignored).
 * Never run --demo against production.
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../src/db";
import {
  appointments,
  availabilityRules,
  credentials,
  psychologistProfiles,
  psychologistSpecializations,
  reviews,
  services,
  specializations,
  users,
  verificationRequests,
} from "../src/db/schema";
import { hashPassword, randomToken } from "../src/lib/server/crypto";

const SPECIALIZATIONS = [
  "Anxiety & Stress",
  "Depression & Low Mood",
  "Trauma & PTSD",
  "Grief & Loss",
  "Relationships & Couples",
  "Family Therapy",
  "Child & Adolescent",
  "Addiction & Substance Use",
  "Burnout & Work Stress",
  "Sleep Problems",
  "Self-esteem & Confidence",
  "Eating Concerns",
  "Student Wellbeing",
  "Perinatal Mental Health",
];

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  const db = await getDb();
  for (const name of SPECIALIZATIONS) {
    await db.insert(specializations).values({ name, slug: slug(name) }).onConflictDoNothing();
  }
  console.log(`Specialisations: ${SPECIALIZATIONS.length} ensured.`);

  if (!process.argv.includes("--demo")) return process.exit(0);
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to create demo accounts in production.");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, "client.demo@calme.test")).limit(1);
  if (existing.length) {
    console.log("Demo accounts already exist; see .data/demo-accounts.md.");
    return process.exit(0);
  }

  const password = `Demo-${randomToken().slice(0, 10)}9`;
  const hash = await hashPassword(password);
  const specs = await db.select().from(specializations);
  const specId = (name: string) => specs.find((s) => s.name === name)!.id;
  const verified = new Date();

  const [admin] = await db.insert(users).values({ email: "admin.demo@calme.test", name: "Akosua Admin", role: "admin", passwordHash: hash, emailVerifiedAt: verified }).returning();
  const [client] = await db
    .insert(users)
    .values({ email: "client.demo@calme.test", name: "Kwame Mensah", role: "client", passwordHash: hash, emailVerifiedAt: verified, phone: "+233 24 000 0001", preferredLanguage: "English", termsAcceptedAt: verified })
    .returning();
  const [client2] = await db
    .insert(users)
    .values({ email: "client2.demo@calme.test", name: "Efua Owusu", role: "client", passwordHash: hash, emailVerifiedAt: verified, termsAcceptedAt: verified })
    .returning();

  const psychs = [
    {
      email: "psych.demo@calme.test",
      name: "Dr. Abena Asante",
      title: "Clinical Psychologist",
      years: 12,
      langs: ["English", "Twi"],
      location: "East Legon, Accra",
      bio: "I help adults living with anxiety, low mood and the after-effects of difficult experiences. My approach blends CBT with compassion-focused therapy, and sessions move at your pace. Many of my clients are professionals balancing demanding careers and family life.",
      specs: ["Anxiety & Stress", "Depression & Low Mood", "Trauma & PTSD"],
      creds: [
        { kind: "degree", title: "PhD Clinical Psychology", institution: "University of Ghana", year: 2013 },
        { kind: "license", title: "GPC Professional Psychologist", institution: "Ghana Psychological Council", year: 2020 },
      ],
      svc: [
        { name: "Individual therapy", durationMinutes: 50, priceMinor: 45000, modes: ["online", "in_person"] as const },
        { name: "Initial consultation", durationMinutes: 30, priceMinor: 20000, modes: ["online"] as const },
      ],
    },
    {
      email: "psych2.demo@calme.test",
      name: "Kofi Boateng",
      title: "Counselling Psychologist",
      years: 6,
      langs: ["English", "Ga", "Ewe"],
      location: "Kumasi",
      bio: "I work with students and young professionals on stress, burnout, self-esteem and relationships. Expect practical tools you can use between sessions and a judgement-free space to talk things through. I also run group sessions on campus wellbeing.",
      specs: ["Student Wellbeing", "Burnout & Work Stress", "Self-esteem & Confidence", "Relationships & Couples"],
      creds: [{ kind: "degree", title: "MPhil Counselling Psychology", institution: "University of Cape Coast", year: 2018 }],
      svc: [{ name: "Counselling session", durationMinutes: 50, priceMinor: 30000, modes: ["online"] as const }],
    },
    {
      email: "psych3.demo@calme.test",
      name: "Dr. Yaa Ofori",
      title: "Child & Family Psychologist",
      years: 18,
      langs: ["English", "Fante"],
      location: "Cape Coast",
      bio: "For nearly two decades I have supported children, teenagers and their families through anxiety, behavioural difficulties, grief and big transitions. Parents are welcome in sessions, and we always agree goals together before we begin.",
      specs: ["Child & Adolescent", "Family Therapy", "Grief & Loss"],
      creds: [
        { kind: "degree", title: "PsyD Child Psychology", institution: "University of Ghana", year: 2007 },
        { kind: "certification", title: "Certified Play Therapist", institution: "Play Therapy International", year: 2011 },
      ],
      svc: [
        { name: "Family session", durationMinutes: 60, priceMinor: 60000, modes: ["in_person"] as const },
        { name: "Teen session", durationMinutes: 50, priceMinor: 40000, modes: ["online", "in_person"] as const },
      ],
    },
  ];

  const created: { id: string; serviceIds: string[] }[] = [];
  for (const p of psychs) {
    const [u] = await db.insert(users).values({ email: p.email, name: p.name, role: "psychologist", phone: "+233 20 000 0000", passwordHash: hash, emailVerifiedAt: verified, termsAcceptedAt: verified }).returning();
    await db.insert(psychologistProfiles).values({
      userId: u.id,
      title: p.title,
      bio: p.bio,
      yearsExperience: p.years,
      licenseNumber: `GPC/PP/${1000 + created.length}`,
      languages: p.langs,
      location: p.location,
      verificationStatus: "approved",
      verifiedAt: verified,
      minNoticeHours: 4,
    });
    await db.insert(psychologistSpecializations).values(p.specs.map((s) => ({ psychologistId: u.id, specializationId: specId(s) })));
    await db.insert(credentials).values(p.creds.map((c) => ({ ...c, psychologistId: u.id })));
    await db.insert(verificationRequests).values({ psychologistId: u.id, status: "approved", reviewerId: admin.id, reviewedAt: verified, reviewerNote: "Verified against the GPC register." });
    const svc = await db.insert(services).values(p.svc.map((s) => ({ ...s, modes: [...s.modes], psychologistId: u.id }))).returning({ id: services.id });
    // Mon–Fri 09:00–12:30 and 13:30–17:00; Saturday morning for the first psychologist
    const rules = [1, 2, 3, 4, 5].flatMap((d) => [
      { psychologistId: u.id, weekday: d, startMinute: 540, endMinute: 750 },
      { psychologistId: u.id, weekday: d, startMinute: 810, endMinute: 1020 },
    ]);
    if (!created.length) rules.push({ psychologistId: u.id, weekday: 6, startMinute: 600, endMinute: 780 });
    await db.insert(availabilityRules).values(rules);
    created.push({ id: u.id, serviceIds: svc.map((s) => s.id) });
  }

  // One application waiting for review
  const [applicant] = await db.insert(users).values({ email: "applicant.demo@calme.test", name: "Esi Agyeman", role: "psychologist", phone: "+233 26 000 0000", passwordHash: hash, emailVerifiedAt: verified, termsAcceptedAt: verified }).returning();
  await db.insert(psychologistProfiles).values({
    userId: applicant.id,
    title: "Psychologist",
    bio: "Recently registered psychologist focusing on perinatal mental health, supporting new and expecting parents through anxiety, low mood and adjustment.",
    yearsExperience: 3,
    licenseNumber: "GPC/PP/2044",
    languages: ["English", "Twi"],
  });
  await db.insert(psychologistSpecializations).values({ psychologistId: applicant.id, specializationId: specId("Perinatal Mental Health") });
  await db.insert(credentials).values({ psychologistId: applicant.id, kind: "degree", title: "MPhil Clinical Psychology", institution: "KNUST", year: 2022 });
  await db.insert(verificationRequests).values({ psychologistId: applicant.id, status: "pending", applicantNote: "Licence certificate available on request." });

  // History: completed past sessions with reviews, spread over recent weeks (gives charts real rows)
  const [p1, p2] = created;
  const past = (daysAgo: number, hour: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const history = [
    { c: client, p: p1, days: 40, h: 9, status: "completed" as const, rating: 5, comment: "Patient, warm and practical. I left with a plan." },
    { c: client2, p: p1, days: 33, h: 10, status: "completed" as const, rating: 5, comment: "I felt heard from the first minute." },
    { c: client, p: p2, days: 26, h: 14, status: "completed" as const, rating: 4, comment: "Helpful tools for exam stress." },
    { c: client2, p: p2, days: 19, h: 9, status: "no_show" as const },
    { c: client, p: p1, days: 12, h: 11, status: "completed" as const, rating: 5, comment: "Exactly what I needed." },
    { c: client2, p: p1, days: 5, h: 15, status: "cancelled" as const },
  ];
  for (const h of history) {
    const start = past(h.days, h.h);
    const [a] = await db
      .insert(appointments)
      .values({
        clientId: h.c.id,
        psychologistId: h.p.id,
        serviceId: h.p.serviceIds[0],
        serviceName: "Individual therapy",
        durationMinutes: 50,
        priceMinor: 45000,
        mode: "online",
        startsAt: start,
        endsAt: new Date(start.getTime() + 50 * 60_000),
        clientTimezone: "Africa/Accra",
        status: h.status,
        confirmedAt: start,
        createdAt: new Date(start.getTime() - 3 * 86400_000),
        cancelledAt: h.status === "cancelled" ? start : null,
        cancelledById: h.status === "cancelled" ? h.c.id : null,
        cancelReason: h.status === "cancelled" ? "Travelling that week" : null,
      })
      .returning();
    if (h.rating) await db.insert(reviews).values({ appointmentId: a.id, clientId: h.c.id, psychologistId: h.p.id, rating: h.rating, comment: h.comment });
  }

  const file = path.join(process.cwd(), ".data", "demo-accounts.md");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `# Local demo accounts (do not commit)\n\nPassword for every account: \`${password}\`\n\n| Role | Email |\n|---|---|\n| Admin | admin.demo@calme.test |\n| Client | client.demo@calme.test |\n| Client | client2.demo@calme.test |\n| Psychologist (verified) | psych.demo@calme.test |\n| Psychologist (verified) | psych2.demo@calme.test |\n| Psychologist (verified) | psych3.demo@calme.test |\n| Psychologist (pending review) | applicant.demo@calme.test |\n`,
  );
  console.log(`Demo accounts created. Credentials written to ${path.relative(process.cwd(), file)}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
