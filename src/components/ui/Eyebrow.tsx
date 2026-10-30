export function Eyebrow({ children, dot }: { children: React.ReactNode; dot?: string }) {
  return (
    <span className="eyebrow">
      <i style={dot ? { background: dot } : undefined} />
      {children}
    </span>
  );
}
