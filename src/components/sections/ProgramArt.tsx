const art = {
  palette: (
    <>
      <path d="M50 10c22 0 40 15 40 34 0 12-10 16-18 16-7 0-9 6-6 11 4 7-1 19-16 19-22 0-40-18-40-40S28 10 50 10z" fill="#fff" stroke="var(--line)" strokeWidth="3" />
      <circle cx="32" cy="38" r="7" fill="var(--coral)" stroke="var(--line)" strokeWidth="2.5" />
      <circle cx="52" cy="28" r="7" fill="var(--sun)" stroke="var(--line)" strokeWidth="2.5" />
      <circle cx="71" cy="40" r="7" fill="var(--blue)" stroke="var(--line)" strokeWidth="2.5" />
      <circle cx="34" cy="62" r="7" fill="var(--mint)" stroke="var(--line)" strokeWidth="2.5" />
    </>
  ),
  chat: (
    <>
      <path d="M14 30h48a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H36l-14 12V66h-8a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" fill="#fff" stroke="var(--line)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M46 18h40a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8h-4v10L70 52" fill="var(--mint)" stroke="var(--line)" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="26" cy="48" r="3" fill="var(--line)" />
      <circle cx="38" cy="48" r="3" fill="var(--line)" />
      <circle cx="50" cy="48" r="3" fill="var(--line)" />
    </>
  ),
  screen: (
    <>
      <rect x="14" y="20" width="72" height="50" rx="8" fill="#fff" stroke="var(--line)" strokeWidth="3" />
      <path d="M40 82h20M50 70v12" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 52c4-10 10-16 18-16s14 6 18 16" fill="none" stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="50" cy="36" r="5" fill="var(--sun)" stroke="var(--line)" strokeWidth="2.5" />
    </>
  ),
};

export function ProgramArt({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-[90px] w-[90px]" aria-hidden>
      {art[name as keyof typeof art]}
    </svg>
  );
}
