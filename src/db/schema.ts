import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (v) => (Buffer.isBuffer(v) ? v : Buffer.from(v)),
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();

/* ───────────── Enums ───────────── */

export const roleEnum = pgEnum("user_role", ["client", "psychologist", "admin"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "suspended", "deactivated"]);
export const tokenTypeEnum = pgEnum("auth_token_type", ["verify_email", "reset_password", "admin_invite"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "needs_info", "approved", "rejected"]);
export const consultationModeEnum = pgEnum("consultation_mode", ["online", "in_person"]);
export const overrideKindEnum = pgEnum("availability_override_kind", ["blocked", "custom_hours"]);
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
  "no_show",
]);
export const reportStatusEnum = pgEnum("report_status", ["open", "in_progress", "resolved"]);
export const fileKindEnum = pgEnum("file_kind", ["avatar", "credential_document"]);

/* ───────────── Accounts & auth ───────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(), // always stored lower-cased
    passwordHash: text("password_hash"), // null until an invited admin sets a password
    name: text("name").notNull(),
    phone: text("phone"),
    role: roleEnum("role").notNull(),
    status: accountStatusEnum("status").notNull().default("active"),
    statusReason: text("status_reason"),
    emailVerifiedAt: ts("email_verified_at"),
    timezone: text("timezone").notNull().default("Africa/Accra"),
    avatarFileId: uuid("avatar_file_id"),
    // Client-only, optional "basic profile" fields
    pronouns: text("pronouns"),
    dateOfBirth: date("date_of_birth"),
    preferredLanguage: text("preferred_language"),
    termsAcceptedAt: ts("terms_accepted_at"),
    lastLoginAt: ts("last_login_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email), index("users_role_idx").on(t.role), index("users_created_idx").on(t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token; the raw token never touches the DB
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: tokenTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_tokens_hash_unique").on(t.tokenHash), index("auth_tokens_user_idx").on(t.userId, t.type)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: ts("reset_at").notNull(),
});

/* ───────────── Files (avatars, credential documents) ───────────── */

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: fileKindEnum("kind").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    originalName: text("original_name"),
    data: bytea("data").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("files_owner_idx").on(t.ownerId)],
);

/* ───────────── Psychologists ───────────── */

export const psychologistProfiles = pgTable(
  "psychologist_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Psychologist"),
    bio: text("bio").notNull().default(""),
    yearsExperience: smallint("years_experience").notNull().default(0),
    licenseNumber: text("license_number").notNull(),
    licensingBody: text("licensing_body").notNull().default("Ghana Psychological Council"),
    // GPC register category: Professional Psychologist | Psychologist Assistant | Paraprofessional
    licenseCategory: text("license_category").notNull().default("Professional Psychologist"),
    licenseExpiresOn: date("license_expires_on"),
    languages: text("languages").array().notNull().default(sql`ARRAY['English']::text[]`),
    location: text("location"),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
    verifiedAt: ts("verified_at"),
    // Scheduling preferences
    timezone: text("timezone").notNull().default("Africa/Accra"),
    bufferMinutes: smallint("buffer_minutes").notNull().default(10),
    minNoticeHours: smallint("min_notice_hours").notNull().default(12),
    maxAdvanceDays: smallint("max_advance_days").notNull().default(60),
    autoConfirm: boolean("auto_confirm").notNull().default(false),
    acceptingClients: boolean("accepting_clients").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("psych_verification_idx").on(t.verificationStatus),
    check("psych_buffer_range", sql`${t.bufferMinutes} BETWEEN 0 AND 120`),
    check("psych_notice_range", sql`${t.minNoticeHours} BETWEEN 0 AND 336`),
    check("psych_advance_range", sql`${t.maxAdvanceDays} BETWEEN 1 AND 365`),
    check("psych_experience_range", sql`${t.yearsExperience} BETWEEN 0 AND 70`),
  ],
);

export const credentials = pgTable(
  "professional_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // degree | license | certification | membership
    title: text("title").notNull(),
    institution: text("institution"),
    year: smallint("year"),
    documentFileId: uuid("document_file_id").references(() => files.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("credentials_psych_idx").on(t.psychologistId)],
);

export const specializations = pgTable(
  "specializations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("specializations_slug_unique").on(t.slug)],
);

export const psychologistSpecializations = pgTable(
  "psychologist_specializations",
  {
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    specializationId: uuid("specialization_id")
      .notNull()
      .references(() => specializations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.psychologistId, t.specializationId] }), index("ps_spec_idx").on(t.specializationId)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: smallint("duration_minutes").notNull(),
    priceMinor: integer("price_minor").notNull(), // pesewas
    currency: text("currency").notNull().default("GHS"),
    modes: consultationModeEnum("modes").array().notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index("services_psych_idx").on(t.psychologistId),
    check("services_duration_range", sql`${t.durationMinutes} BETWEEN 15 AND 240`),
    check("services_price_nonneg", sql`${t.priceMinor} >= 0`),
  ],
);

/** Recurring weekly hours, in the psychologist's own timezone. Several rows per weekday = several periods. */
export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0 = Sunday … 6 = Saturday
    startMinute: smallint("start_minute").notNull(),
    endMinute: smallint("end_minute").notNull(),
  },
  (t) => [
    index("availability_rules_psych_idx").on(t.psychologistId, t.weekday),
    check("rules_weekday_range", sql`${t.weekday} BETWEEN 0 AND 6`),
    check("rules_minutes_range", sql`${t.startMinute} >= 0 AND ${t.endMinute} <= 1440 AND ${t.startMinute} < ${t.endMinute}`),
  ],
);

/**
 * Date-specific exceptions.
 *  - blocked: whole days off from start_date to end_date (holiday, leave).
 *  - custom_hours: on start_date only, these hours REPLACE the weekly hours (one row per period).
 */
export const availabilityOverrides = pgTable(
  "availability_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    kind: overrideKindEnum("kind").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startMinute: smallint("start_minute"),
    endMinute: smallint("end_minute"),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [
    index("availability_overrides_psych_idx").on(t.psychologistId, t.startDate),
    check("overrides_dates", sql`${t.startDate} <= ${t.endDate}`),
    check(
      "overrides_shape",
      sql`(${t.kind} = 'blocked' AND ${t.startMinute} IS NULL AND ${t.endMinute} IS NULL)
        OR (${t.kind} = 'custom_hours' AND ${t.startDate} = ${t.endDate} AND ${t.startMinute} >= 0 AND ${t.endMinute} <= 1440 AND ${t.startMinute} < ${t.endMinute})`,
    ),
  ],
);

/* ───────────── Appointments ───────────── */

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    // Snapshots, so later edits to the service don't rewrite history
    serviceName: text("service_name").notNull(),
    durationMinutes: smallint("duration_minutes").notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull().default("GHS"),
    mode: consultationModeEnum("mode").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    clientTimezone: text("client_timezone").notNull(),
    status: appointmentStatusEnum("status").notNull().default("pending"),
    // Private between client and psychologist. Admins never see this field.
    clientNote: text("client_note"),
    meetingDetails: text("meeting_details"),
    cancelledById: uuid("cancelled_by_id").references(() => users.id, { onDelete: "set null" }),
    cancelReason: text("cancel_reason"),
    cancelledAt: ts("cancelled_at"),
    lateCancellation: boolean("late_cancellation").notNull().default(false),
    rescheduleCount: smallint("reschedule_count").notNull().default(0),
    confirmedAt: ts("confirmed_at"),
    reminderSentAt: ts("reminder_sent_at"),
    createdAt: createdAt(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("appointments_client_idx").on(t.clientId, t.startsAt),
    index("appointments_psych_idx").on(t.psychologistId, t.startsAt),
    index("appointments_status_idx").on(t.status, t.startsAt),
    check("appointments_time_order", sql`${t.startsAt} < ${t.endsAt}`),
    // The no-overlap exclusion constraint is added in a hand-written migration (needs btree_gist).
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("reviews_appointment_unique").on(t.appointmentId),
    index("reviews_psych_idx").on(t.psychologistId),
    check("reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

export const profileViews = pgTable(
  "profile_views",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    viewedAt: ts("viewed_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.psychologistId] }), index("profile_views_recent_idx").on(t.userId, t.viewedAt)],
);

/* ───────────── Platform oversight ───────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => psychologistProfiles.userId, { onDelete: "cascade" }),
    status: verificationStatusEnum("status").notNull().default("pending"),
    applicantNote: text("applicant_note"),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewerNote: text("reviewer_note"), // shown to the psychologist
    reviewedAt: ts("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [index("verification_requests_status_idx").on(t.status, t.createdAt), index("verification_requests_psych_idx").on(t.psychologistId)],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_logs_created_idx").on(t.createdAt), index("activity_logs_actor_idx").on(t.actorId), index("activity_logs_action_idx").on(t.action)],
);

export const supportReports = pgTable(
  "support_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    category: text("category").notNull(), // scheduling | technical | conduct | other
    message: text("message").notNull(),
    status: reportStatusEnum("status").notNull().default("open"),
    resolution: text("resolution"),
    handledById: uuid("handled_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("support_reports_status_idx").on(t.status, t.createdAt)],
);

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedById: uuid("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type AppointmentStatus = (typeof appointmentStatusEnum.enumValues)[number];
export type ConsultationMode = (typeof consultationModeEnum.enumValues)[number];
export type VerificationStatus = (typeof verificationStatusEnum.enumValues)[number];
