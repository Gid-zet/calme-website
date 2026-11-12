# CalMe: A healthy mind in a healthy body

CalMe is a mental health organisation's website and booking platform. It connects people looking for support with GPC-verified psychologists. It is built with **Next.js 16 (App Router, Cache Components)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **PostgreSQL + Drizzle ORM** and **Zod**.

There are three roles, each with its own experience:

| Role | Lands on | What they get |
|---|---|---|
| Client | `/dashboard` | A discovery and booking app: find, compare and book psychologists, then manage appointments |
| Psychologist | `/practice` | A practice workspace: calendar, requests, availability, services, profile and verification |
| Admin | `/admin` | A platform console: analytics, verification queue, users, appointments, reports, settings and the audit log |

## Getting started (local, no database install)

```bash
npm install
npm run db:seed -- --demo   # creates the embedded DB, specialisations and demo accounts
npm run dev
```

Demo account emails and their generated password are written to `.data/demo-accounts.md`, which is git-ignored. Locally, emails such as verification, reset and booking emails go to `.data/outbox/` and are also printed in the dev server console.

## Configuration

See [.env.example](.env.example). For production you need:

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | PostgreSQL. Must allow `CREATE EXTENSION btree_gist` (Neon, Supabase and RDS all do). |
| `APP_URL` | Absolute links in emails |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sending email through [Resend](https://resend.com). The sending domain must be verified with Resend. |
| `CRON_SECRET` | `GET /api/cron/reminders`. Schedule it every 15–60 min (e.g. Vercel Cron) to send 24-hour reminders and release unconfirmed requests. |

Payments are **not** integrated. Fees are shown at booking and paid directly to the psychologist.

### Deploying

```bash
npm run db:migrate          # applies ./drizzle migrations to DATABASE_URL
npm run db:seed             # reference data only (never use --demo in production)
npm run admin:create -- --email you@org --name "Your Name"   # prints a one-time admin invite link
npm run build && npm start
```

## Scripts

| Script | What it does |
|---|---|
| `npm test` | Unit tests for the scheduling engine (slots, buffers, overrides, DST) |
| `npm run test:booking` | Integration tests against a throwaway database: double booking, blocked dates, guards, reschedules |
| `npm run typecheck` | TypeScript |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run admin:create` | Bootstrap an administrator (the only way to create the first admin) |

## Project structure

```
src/
  app/
    (site)/            public pages incl. /psychologists (directory), /psychologists/[id] (profile),
                       /psychologists/[id]/book (booking wizard), /psychologists/compare
    (auth)/            sign-in, sign-up (client / psychologist), forgot & reset password, verify email, admin invite
    (client)/dashboard client area: overview, appointments, notifications, account
    (practice)/practice psychologist workspace: overview, schedule, appointments, availability, services, profile, verification
    (admin)/admin      admin console: overview, psychologists, users, appointments, reports, specialisations, settings, activity
    api/               slots, file downloads, email verification, cron
    *-actions.ts       server actions per area (each re-checks the session and role)
  db/                  Drizzle schema + client (Postgres, or embedded PGlite locally)
  lib/
    scheduling/        pure slot engine + time-zone helpers (unit-tested)
    server/            auth/session, booking rules, directory, admin read models, email, rate limiting, audit
  proxy.ts             optimistic redirect for signed-out visitors + security headers
drizzle/               SQL migrations (0001 adds the no-double-booking exclusion constraints)
scripts/               seed, migrate, create-admin, booking integration tests
docs/platform.md       architecture, security model and research notes
```

## Still to do

- [ ] Replace the placeholder contact details and US crisis numbers in `src/lib/content.ts` with Ghanaian ones
- [ ] Add privacy policy and terms text, and register with Ghana's Data Protection Commission before launch
- [ ] Connect the contact, partner, volunteer and newsletter forms
- [ ] Payments (e.g. Paystack), if CalMe decides to collect fees on the platform
