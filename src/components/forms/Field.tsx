"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "../ui/Icon";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">;

/** Labelled input wired for accessibility: errors are announced and linked with aria-describedby. */
export function Field({ label, name, error, hint, optional, className = "", ...input }: FieldProps) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>
        {label} {optional && <span className="font-medium text-ink-2">(optional)</span>}
      </label>
      <input id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...input} />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-2">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-err`} error={error} />
    </div>
  );
}

export function FieldError({ id, error }: { id?: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-sm font-semibold text-[#c2410c]">
      <span aria-hidden>⚠</span> {error}
    </p>
  );
}

export function TextArea({
  label,
  name,
  error,
  hint,
  optional,
  ...rest
}: { label: string; name: string; error?: string; hint?: React.ReactNode; optional?: boolean } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="font-medium text-ink-2">(optional)</span>}
      </label>
      <textarea id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest} />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-ink-2">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-err`} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  error,
  children,
  ...rest
}: { label: string; name: string; error?: string; children: React.ReactNode } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...rest}>
        {children}
      </select>
      <FieldError id={`${id}-err`} error={error} />
    </div>
  );
}

export function PasswordField({
  label = "Password",
  name = "password",
  error,
  autoComplete = "current-password",
  showStrength,
  extra,
}: {
  label?: string;
  name?: string;
  error?: string;
  autoComplete?: string;
  showStrength?: boolean;
  extra?: React.ReactNode;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const checks = [
    { ok: value.length >= 10, label: "10+ characters" },
    { ok: /[A-Za-z]/.test(value), label: "a letter" },
    { ok: /\d/.test(value), label: "a number" },
  ];
  return (
    <div className="field">
      <div className="flex items-center justify-between">
        <label htmlFor={id}>{label}</label>
        {extra}
      </div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required
          maxLength={128}
          autoComplete={autoComplete}
          className="!pr-12"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : showStrength ? `${id}-rules` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink"
        >
          <Icon name="eye" className="h-5 w-5" />
        </button>
      </div>
      {showStrength && (
        <ul id={`${id}-rules`} className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "font-semibold text-[#15803d]" : "text-ink-2"}>
              {c.ok ? "✓" : "○"} {c.label}
            </li>
          ))}
        </ul>
      )}
      <FieldError id={`${id}-err`} error={error} />
    </div>
  );
}

export function SubmitButton({ children, className = "btn btn-primary", pendingLabel }: { children: React.ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className} justify-center disabled:cursor-wait disabled:opacity-70`}>
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          {pendingLabel ?? "Please wait…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ message, ok }: { message?: string; ok?: boolean }) {
  if (!message) return null;
  return (
    <div role={ok ? "status" : "alert"} className={`rounded-[14px] border-2 border-ink px-4 py-3 text-sm font-semibold ${ok ? "bg-mint-soft" : "bg-coral-soft"}`}>
      {message}
    </div>
  );
}
