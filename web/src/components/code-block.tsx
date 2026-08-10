import type { ReactNode } from "react";

export function CodeBlock({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-line-subtle bg-surface">
      {title ? (
        <div className="border-b border-line-subtle px-3.5 py-2">
          <span className="label">{title}</span>
        </div>
      ) : null}
      <div className="overflow-x-auto p-3.5">
        <pre className="font-mono text-xs leading-relaxed text-ink-2">{children}</pre>
      </div>
    </div>
  );
}

/** Paso numerado. La numeración acá sí significa algo: el orden importa,
 *  no se puede crear el secret antes de tener el webhook. */
export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-3">
      <span className="nums mt-0.5 grid size-7 place-items-center rounded-sm border border-accent-border bg-accent-bg font-mono text-2xs font-semibold text-accent">
        {n}
      </span>
      <div className="min-w-0 pb-1">
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <div className="mt-1.5 flex flex-col gap-2.5 text-sm text-ink-2">
          {children}
        </div>
      </div>
    </li>
  );
}
