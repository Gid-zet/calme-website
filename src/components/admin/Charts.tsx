/**
 * Small server-rendered SVG charts for the admin console. No chart library needed.
 * Hover uses native <title> tooltips on generous hit areas; every chart has a table view for screen readers.
 */

const W = 640;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 34 };
const weekLabel = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow) * pow;
}

function Grid({ max }: { max: number }) {
  const ih = H - PAD.top - PAD.bottom;
  return (
    <g>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + ih * (1 - t)} y2={PAD.top + ih * (1 - t)} stroke="#e6e3da" strokeWidth={1} />
          <text x={PAD.left - 6} y={PAD.top + ih * (1 - t) + 4} textAnchor="end" fontSize={11} fill="var(--ink-2)">
            {Math.round(max * t)}
          </text>
        </g>
      ))}
    </g>
  );
}

export function WeeklyBars({ data, title, valueLabel }: { data: { week: string; value: number; secondary?: number }[]; title: string; valueLabel: string }) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const slot = iw / data.length;
  const bw = Math.max(6, slot - 8);
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-bold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. Table below.`}>
        <Grid max={max} />
        {data.map((d, i) => {
          const h = (d.value / max) * ih;
          const x = PAD.left + i * slot + (slot - bw) / 2;
          const y = PAD.top + ih - h;
          return (
            <g key={d.week}>
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={ih} fill="transparent">
                <title>{`Week of ${weekLabel(d.week)}: ${d.value} ${valueLabel}${d.secondary != null ? ` (${d.secondary} cancelled or declined)` : ""}`}</title>
              </rect>
              {h > 0 && <path d={`M${x},${PAD.top + ih} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${PAD.top + ih} Z`} fill="var(--blue)" pointerEvents="none" />}
              {i % 2 === data.length % 2 && (
                <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={10.5} fill="var(--ink-2)">
                  {weekLabel(d.week)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-1 text-xs text-ink-2">
        <summary className="cursor-pointer font-semibold">Show as table</summary>
        <table className="tbl mt-2">
          <thead>
            <tr>
              <th>Week of</th>
              <th>{valueLabel}</th>
              {data[0]?.secondary != null && <th>Cancelled/declined</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week}>
                <td>{weekLabel(d.week)}</td>
                <td>{d.value}</td>
                {d.secondary != null && <td>{d.secondary}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const SERIES = [
  { key: "clients", label: "Clients", color: "#1f6fe5" },
  { key: "psychologists", label: "Psychologists", color: "#c2410c" },
] as const;

export function SignupLines({ data }: { data: { week: string; clients: number; psychologists: number }[] }) {
  const max = niceMax(Math.max(0, ...data.flatMap((d) => [d.clients, d.psychologists])));
  const iw = W - PAD.left - PAD.right - 70; // room for direct labels
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  return (
    <figure>
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        New sign-ups per week
        <span className="flex gap-3 text-xs font-semibold text-ink-2">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="inline-block h-[3px] w-4 rounded" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="New sign-ups per week, clients and psychologists. Table below.">
        <Grid max={max} />
        {SERIES.map((s) => (
          <g key={s.key}>
            <polyline points={data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {data.length > 0 && (
              <text x={x(data.length - 1) + 8} y={y(data[data.length - 1][s.key]) + 4} fontSize={11} fontWeight={700} fill="var(--ink)">
                {s.label}
              </text>
            )}
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.week}>
            <rect x={x(i) - iw / data.length / 2} y={PAD.top} width={iw / data.length} height={ih} fill="transparent">
              <title>{`Week of ${weekLabel(d.week)}: ${d.clients} clients, ${d.psychologists} psychologists`}</title>
            </rect>
            {SERIES.map((s) => (
              <circle key={s.key} cx={x(i)} cy={y(d[s.key])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} pointerEvents="none" />
            ))}
            {i % 2 === data.length % 2 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill="var(--ink-2)">
                {weekLabel(d.week)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <details className="mt-1 text-xs text-ink-2">
        <summary className="cursor-pointer font-semibold">Show as table</summary>
        <table className="tbl mt-2">
          <thead>
            <tr>
              <th>Week of</th>
              <th>Clients</th>
              <th>Psychologists</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week}>
                <td>{weekLabel(d.week)}</td>
                <td>{d.clients}</td>
                <td>{d.psychologists}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal proportion bar for appointment outcomes (single measure, direct labels). */
export function OutcomeBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return <p className="text-sm text-ink-2">No appointments yet.</p>;
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p) => (p.value ? <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} /> : null))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <b>{p.value}</b> <span className="text-ink-2">({Math.round((p.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
