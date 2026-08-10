import type { ReactNode } from "react";

import { SEVERITY_STYLES } from "@/lib/format";
import type { Severity } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-2xs font-medium tracking-wide ${style.bg} ${style.text}`}
    >
      <span className={`size-1.5 rounded-full ${style.rail}`} aria-hidden="true" />
      {severity}
    </span>
  );
}

/** Chip de metadata. `tone` distingue el dato principal del contexto. */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "paid" | "outline";
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2 border-transparent",
    accent: "bg-accent-bg text-accent border-accent-border",
    paid: "bg-paid-bg text-paid border-paid-border",
    outline: "bg-transparent text-ink-3 border-line",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-2xs tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Encabezado de sección: eyebrow en mono + título. */
export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="label mb-1.5">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-balance">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-[65ch] text-ink-2">{description}</p>
      ) : null}
    </div>
  );
}

/** Tarjeta de estadística. El número es el protagonista. */
export function StatTile({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-line-subtle bg-surface p-4">
      <p className="nums font-mono text-2xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-ink-2">{label}</p>
      {hint ? <p className="mt-1 text-2xs text-ink-3">{hint}</p> : null}
    </div>
  );
}
