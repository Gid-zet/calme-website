CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."consultation_mode" AS ENUM('online', 'in_person');--> statement-breakpoint
CREATE TYPE "public"."file_kind" AS ENUM('avatar', 'credential_document');--> statement-breakpoint
CREATE TYPE "public"."availability_override_kind" AS ENUM('blocked', 'custom_hours');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'in_progress', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'psychologist', 'admin');--> statement-breakpoint
CREATE TYPE "public"."auth_token_type" AS ENUM('verify_email', 'reset_password', 'admin_invite');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'needs_info', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"metadata" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"service_id" uuid,
	"service_name" text NOT NULL,
	"duration_minutes" smallint NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"mode" "consultation_mode" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"client_timezone" text NOT NULL,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"client_note" text,
	"meeting_details" text,
	"cancelled_by_id" uuid,
	"cancel_reason" text,
	"cancelled_at" timestamp with time zone,
	"late_cancellation" boolean DEFAULT false NOT NULL,
	"reschedule_count" smallint DEFAULT 0 NOT NULL,
	"confirmed_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_time_order" CHECK ("appointments"."starts_at" < "appointments"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "auth_token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"kind" "availability_override_kind" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_minute" smallint,
	"end_minute" smallint,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "overrides_dates" CHECK ("availability_overrides"."start_date" <= "availability_overrides"."end_date"),
	CONSTRAINT "overrides_shape" CHECK (("availability_overrides"."kind" = 'blocked' AND "availability_overrides"."start_minute" IS NULL AND "availability_overrides"."end_minute" IS NULL)
        OR ("availability_overrides"."kind" = 'custom_hours' AND "availability_overrides"."start_date" = "availability_overrides"."end_date" AND "availability_overrides"."start_minute" >= 0 AND "availability_overrides"."end_minute" <= 1440 AND "availability_overrides"."start_minute" < "availability_overrides"."end_minute"))
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_minute" smallint NOT NULL,
	"end_minute" smallint NOT NULL,
	CONSTRAINT "rules_weekday_range" CHECK ("availability_rules"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "rules_minutes_range" CHECK ("availability_rules"."start_minute" >= 0 AND "availability_rules"."end_minute" <= 1440 AND "availability_rules"."start_minute" < "availability_rules"."end_minute")
);
--> statement-breakpoint
CREATE TABLE "professional_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"institution" text,
	"year" smallint,
	"document_file_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "file_kind" NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"original_name" text,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"user_id" uuid NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_views_user_id_psychologist_id_pk" PRIMARY KEY("user_id","psychologist_id")
);
--> statement-breakpoint
CREATE TABLE "psychologist_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"title" text DEFAULT 'Psychologist' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"years_experience" smallint DEFAULT 0 NOT NULL,
	"license_number" text NOT NULL,
	"licensing_body" text DEFAULT 'Ghana Psychological Council' NOT NULL,
	"license_category" text DEFAULT 'Professional Psychologist' NOT NULL,
	"license_expires_on" date,
	"languages" text[] DEFAULT ARRAY['English']::text[] NOT NULL,
	"location" text,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"timezone" text DEFAULT 'Africa/Accra' NOT NULL,
	"buffer_minutes" smallint DEFAULT 10 NOT NULL,
	"min_notice_hours" smallint DEFAULT 12 NOT NULL,
	"max_advance_days" smallint DEFAULT 60 NOT NULL,
	"auto_confirm" boolean DEFAULT false NOT NULL,
	"accepting_clients" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "psych_buffer_range" CHECK ("psychologist_profiles"."buffer_minutes" BETWEEN 0 AND 120),
	CONSTRAINT "psych_notice_range" CHECK ("psychologist_profiles"."min_notice_hours" BETWEEN 0 AND 336),
	CONSTRAINT "psych_advance_range" CHECK ("psychologist_profiles"."max_advance_days" BETWEEN 1 AND 365),
	CONSTRAINT "psych_experience_range" CHECK ("psychologist_profiles"."years_experience" BETWEEN 0 AND 70)
);
--> statement-breakpoint
CREATE TABLE "psychologist_specializations" (
	"psychologist_id" uuid NOT NULL,
	"specialization_id" uuid NOT NULL,
	CONSTRAINT "psychologist_specializations_psychologist_id_specialization_id_pk" PRIMARY KEY("psychologist_id","specialization_id")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" smallint NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'GHS' NOT NULL,
	"modes" "consultation_mode"[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_duration_range" CHECK ("services"."duration_minutes" BETWEEN 15 AND 240),
	CONSTRAINT "services_price_nonneg" CHECK ("services"."price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specializations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"appointment_id" uuid,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"handled_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"phone" text,
	"role" "user_role" NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"email_verified_at" timestamp with time zone,
	"timezone" text DEFAULT 'Africa/Accra' NOT NULL,
	"avatar_file_id" uuid,
	"pronouns" text,
	"date_of_birth" date,
	"preferred_language" text,
	"terms_accepted_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"applicant_note" text,
	"reviewer_id" uuid,
	"reviewer_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_document_file_id_files_id_fk" FOREIGN KEY ("document_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD CONSTRAINT "psychologist_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychologist_specializations" ADD CONSTRAINT "psychologist_specializations_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychologist_specializations" ADD CONSTRAINT "psychologist_specializations_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_reports" ADD CONSTRAINT "support_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_reports" ADD CONSTRAINT "support_reports_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_reports" ADD CONSTRAINT "support_reports_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_created_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_actor_idx" ON "activity_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "activity_logs_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "appointments_client_idx" ON "appointments" USING btree ("client_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_psych_idx" ON "appointments" USING btree ("psychologist_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_hash_unique" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "availability_overrides_psych_idx" ON "availability_overrides" USING btree ("psychologist_id","start_date");--> statement-breakpoint
CREATE INDEX "availability_rules_psych_idx" ON "availability_rules" USING btree ("psychologist_id","weekday");--> statement-breakpoint
CREATE INDEX "credentials_psych_idx" ON "professional_credentials" USING btree ("psychologist_id");--> statement-breakpoint
CREATE INDEX "files_owner_idx" ON "files" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_views_recent_idx" ON "profile_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE INDEX "psych_verification_idx" ON "psychologist_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "ps_spec_idx" ON "psychologist_specializations" USING btree ("specialization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_appointment_unique" ON "reviews" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "reviews_psych_idx" ON "reviews" USING btree ("psychologist_id");--> statement-breakpoint
CREATE INDEX "services_psych_idx" ON "services" USING btree ("psychologist_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "specializations_slug_unique" ON "specializations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "support_reports_status_idx" ON "support_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verification_requests_status_idx" ON "verification_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "verification_requests_psych_idx" ON "verification_requests" USING btree ("psychologist_id");