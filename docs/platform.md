# CalMe platform: architecture, security and research notes

## 1. Research summary

We studied BetterHelp, Talkspace, Psychology Today, Zocdoc, Headway/Alma, SimplePractice and Calendly, and read Cal.com's scheduling source. We also searched GitHub for the projects named in the brief ("WellMind", "BookEasy", "OpenPsychologist"). The only exact match, `raritysoftware/OpenPsychologist`, is a tiny PHP demo with no provider role, schedules or verification. The other names belong to unrelated student projects. None was usable as prior art, so Cal.com is the reference implementation for scheduling.

What we took, and why:

| Pattern | Seen in | How CalMe applies it |
|---|---|---|
| Directory with filters + "next available" on each card | Psychology Today, Zocdoc | `/psychologists`: specialisation, language, session type, max fee, experience, "available in 7 days", sort by soonest |
| Provider credential checks before listing | BetterHelp, Zocdoc, Psychology Today "Verified" | Psychologists apply with their Ghana Psychological Council (GPC) category and number. Admins approve, request info or reject. Only approved, active, accepting providers with an active service are listed. |
| Request → accept model, with optional instant booking | SimplePractice / Cal.com "requires confirmation" | Per-psychologist "confirm automatically" toggle. Default is manual. |
| Late-cancellation policy | SimplePractice | Platform-wide window (24 h by default). Cancelling inside it is allowed but flagged `late_cancellation`. Rescheduling closes at the window, with a maximum of 2 moves. |
| Weekly hours + date overrides + buffers + minimum notice + horizon | Cal.com, Calendly | `availability_rules`, `availability_overrides` (blocked ranges, or custom hours that replace a day), per-psychologist break, notice and horizon |
| Server-side re-check at booking time | Cal.com `ensureAvailableUsers` | `createBooking` recomputes availability inside a transaction that locks the psychologist row |
| Stronger double-booking guard | (beyond Cal.com, which only dedupes identical slots) | Postgres `EXCLUDE USING gist` on `(psychologist_id, tstzrange)` and `(client_id, tstzrange)` for pending/confirmed appointments |
| Provider home: today, requests, setup checklist | SimplePractice, Cal.com | `/practice` overview with onboarding checklist, requests inbox, 7-day agenda and real stats |
| Marketplace admin: KPIs, verification queue, audit feed | Common marketplace practice | `/admin` with live KPIs, weekly charts, queue, activity log |

## 2. Roles and authorisation

- `users.role` is one of `client | psychologist | admin`, and every account has exactly one role.
- **Public sign-up can only create clients or psychologists.** These are two separate server actions, and the role is fixed in code, never read from the form.
- **Admins** are created only by `npm run admin:create` (prints a one-time invite link) or by an existing admin from *Settings & team*. Invitees set their own password via a 72-hour single-use token.
- **Authorisation is enforced on the server**: every page, server action and route handler calls `requireRole` / `assertRole` (`src/lib/server/auth.ts`). `src/proxy.ts` only does an optimistic redirect when no cookie exists.
- Data queries are always scoped by the signed-in user's id (`getAppointmentFor(id, userId, as)`, `getOwned`, etc.), so one psychologist can't read another's appointments, and a client can't touch someone else's booking.

## 3. Sessions and accounts

| Concern | Implementation |
|---|---|
| Password hashing | scrypt, N=2¹⁷, r=8, p=1, 16-byte salt. Parameters are stored with the hash. |
| Sessions | 256-bit random token in an `HttpOnly; SameSite=Lax; Secure` (prod) cookie. Only its SHA-256 is stored in the DB. 14-day expiry. |
| Logout | Deletes the session row and the cookie |
| Password reset | 1-hour single-use hashed token. Generic response, so it doesn't reveal whether an account exists. Signs out all devices. |
| Email verification | 24-hour single-use token. Clients must verify before booking. |
| Rate limiting | Postgres fixed-window: login 8 per 15 min per email and 30 per IP. Sign-up 10 per hour per IP. Reset 3 per hour per email. Bookings 10 per hour per user. Reports 5 per hour. |
| Suspension | Suspending or deactivating deletes all of the user's sessions. Inactive users can't sign in, can't be booked and aren't listed. |
| Open redirects | `safeNext` only allows same-site paths in the user's own area |
| Headers | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Private pages get `no-store`. |

## 4. Privacy

- **No clinical records.** The only free text a client gives is an optional note to their psychologist.
- **`appointments.client_note` and `meeting_details` are never selected by any admin query.** Admin appointment lists show masked client names (e.g. "K•••• M."). Opening an appointment's detail page shows the full name and is written to the audit log (`admin.viewed_appointment`).
- Credential documents are private files, served only to their owner and admins, and each admin view is logged. Avatars are public.
- Uploads are limited by size and identified by their **magic bytes**, never by the browser's claimed type. They are served with `nosniff` and a sandboxing CSP.
- Reviews show the client's first name and last initial only.
- Ghana Data Protection Act 2012 (Act 843): health information is "special personal data". Sign-up captures explicit consent. **Before launch, CalMe must register as a data controller with the Data Protection Commission.**

## 5. Scheduling engine

`src/lib/scheduling/slots.ts` is a pure function covered by unit tests:

1. For each date in the psychologist's time zone:
   - if a **blocked** override covers it → no hours that day;
   - else if **custom hours** exist for that date → use them (they replace the weekly hours);
   - else use the **weekly rules** for that weekday. Periods are merged.
2. Wall-clock periods are converted to UTC instants **for that specific date**, so daylight saving time is handled, using `Intl` only with no date library.
3. Slots start at each period's start and step by `duration + break`. A slot is offered only if it ends inside the period, starts after `now + minimum notice` and before `now + horizon`, and doesn't overlap any pending or confirmed appointment widened by the break on both sides.
4. Clients see times in their own time zone. Rescheduling excludes the appointment being moved.

At booking, `createBooking`:
- checks the client role and that their email is verified;
- checks the service is active, the method is allowed, and the psychologist is listed;
- locks the psychologist row, recomputes availability and requires an **exact** slot match;
- inserts the appointment. If two requests still race, the exclusion constraint rejects one (`23P01`).

Appointment states: `pending → confirmed → completed | no_show`, `pending → declined`, and `pending|confirmed → cancelled` (with `late_cancellation`, `cancelled_by` and a reason). Pending requests that aren't confirmed by 2 h before the start are released automatically.

## 6. Data model (Drizzle, `src/db/schema.ts`)

`users`, `sessions`, `auth_tokens`, `rate_limits`, `files`, `psychologist_profiles` (1:1 with a psychologist user), `professional_credentials`, `specializations`, `psychologist_specializations`, `services`, `availability_rules`, `availability_overrides`, `appointments`, `reviews` (one per completed appointment), `profile_views` (recently viewed), `notifications`, `verification_requests`, `activity_logs`, `support_reports`, `platform_settings`. Check constraints guard ranges such as times, ratings and durations.

## 7. Testing

- `npm test`: slot-engine unit tests (11)
- `npm run test:booking`: integration tests on a throwaway database (15)
  - concurrent double booking
  - off-grid, outside-hours and weekend starts
  - blocked dates and custom hours
  - client self-overlap
  - role and email-verification guards; unverified or suspended psychologists
  - time zones
  - reschedule and cancel rules, outcome timing, stale-request release
- Manual run-through in the browser for all three roles:
  - sign-up with validation errors, email verification (token single-use) and password reset (old session revoked)
  - booking → accept, the psychologist calendar and availability editing
  - the admin verification decision, masked admin lists, and cross-role redirects
- HTTP checks:
  - private pages without a cookie redirect;
  - a forged cookie gets a redirect and no data;
  - the cron endpoint rejects a missing or wrong secret;
  - `/api/slots?exclude=` requires a participant session;
  - malformed ids return 400 or 404.
