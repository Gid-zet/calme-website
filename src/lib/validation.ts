import { z } from "zod";

/** Shared input rules. Used by server actions (authoritative) and mirrored by HTML attributes in forms. */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address."));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use at most 128 characters.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number.");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number, e.g. +233 24 123 4567.");

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const timezone = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone.")
  .catch("Africa/Accra");

const terms = z.literal("on", { error: "Please accept the Terms and Privacy Policy to continue." });

const passwords = z.object({ password: passwordSchema, confirmPassword: z.string() });
const matchPasswords = <T extends z.infer<typeof passwords>>(d: T, ctx: z.RefinementCtx) => {
  if (d.password !== d.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords don't match." });
};

export const clientSignUpSchema = z
  .object({
    name: trimmed(2, 100, "Full name"),
    email: emailSchema,
    phone: optional(phoneSchema),
    preferredLanguage: optional(trimmed(2, 40, "Language")),
    pronouns: optional(trimmed(1, 30, "Pronouns")),
    timezone,
    terms,
  })
  .extend(passwords.shape)
  .superRefine(matchPasswords);

export const LICENSE_CATEGORIES = ["Professional Psychologist", "Psychologist Assistant", "Paraprofessional"] as const;

export const credentialSchema = z.object({
  kind: z.enum(["degree", "license", "certification", "membership"]),
  title: trimmed(2, 160, "Qualification"),
  institution: optional(trimmed(2, 160, "Institution")),
  year: optional(z.coerce.number().int().min(1950, "Enter a valid year.").max(new Date().getFullYear() + 1, "Enter a valid year.")),
});

export const psychologistSignUpSchema = z
  .object({
    name: trimmed(2, 100, "Full name"),
    email: emailSchema,
    phone: phoneSchema,
    title: trimmed(2, 80, "Professional title"),
    licenseCategory: z.enum(LICENSE_CATEGORIES),
    licenseNumber: trimmed(3, 60, "Registration number"),
    licenseExpiresOn: optional(z.iso.date("Enter a valid date.")),
    yearsExperience: z.coerce.number().int().min(0, "Enter 0 or more.").max(70, "Enter 70 or fewer."),
    specializationIds: z.array(z.uuid()).min(1, "Choose at least one area of specialisation.").max(12, "Choose up to 12."),
    credentials: z.array(credentialSchema).min(1, "Add at least one qualification.").max(15),
    bio: trimmed(80, 2000, "Biography"),
    languages: z.array(trimmed(2, 40, "Language")).min(1, "Choose at least one language.").max(10),
    timezone,
    terms,
  })
  .extend(passwords.shape)
  .superRefine(matchPasswords);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const resetPasswordSchema = z.object({ token: z.string().min(20).max(100) }).extend(passwords.shape).superRefine(matchPasswords);

export const MODES = ["online", "in_person"] as const;
export const serviceSchema = z.object({
  name: trimmed(2, 80, "Service name"),
  description: optional(trimmed(2, 500, "Description")),
  durationMinutes: z.coerce.number().int().min(15, "At least 15 minutes.").max(240, "At most 4 hours."),
  price: z.coerce.number().min(0, "Price can't be negative.").max(100000),
  modes: z.array(z.enum(MODES)).min(1, "Choose at least one consultation method."),
  active: z.boolean(),
});

/** Turns zod issues into { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    out[key] ??= issue.message;
  }
  return out;
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};
