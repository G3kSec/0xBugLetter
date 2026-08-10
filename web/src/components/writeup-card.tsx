import { SEVERITY_STYLES, formatBounty, formatDate, hostOf } from "@/lib/format";
import type { Writeup } from "@/lib/types";

import { Chip, SeverityBadge } from "./ui";

/**
 * El rail de severidad a la izquierda es la firma visual del archivo:
 * permite escanear una columna de 30 entradas y ubicar lo grave sin leer.
 */
export function WriteupCard({ writeup }: { writeup: Writeup }) {
  const rail = SEVERITY_STYLES[writeup.severity].rail;

  return (
    <article className="group relative flex gap-0 overflow-hidden rounded-md border border-line-subtle bg-surface transition-colors hover:border-line">
      <div className={`w-[3px] shrink-0 ${rail}`} aria-hidden="true" />

      <div className="min-w-0 flex-1 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={writeup.severity} />
          <Chip tone="accent">{writeup.bugType}</Chip>
          {writeup.cwe ? <Chip tone="outline">{writeup.cwe}</Chip> : null}
          {writeup.isPaid === true ? (
            <Chip tone="paid">
              {writeup.bountyAmount
                ? formatBounty(writeup.bountyAmount, writeup.currency)
                : "PAGADO"}
            </Chip>
          ) : null}
        </div>

        <h3 className="text-balance text-base font-semibold leading-snug tracking-tight">
          <a
            href={writeup.url}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors after:absolute after:inset-0 hover:text-accent"
          >
            {writeup.title}
          </a>
        </h3>

        {writeup.summary ? (
          <p className="mt-1.5 text-sm text-ink-2">{writeup.summary}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs text-ink-3">
          <span className="text-ink-2">{writeup.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={writeup.date}>{formatDate(writeup.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{writeup.source}</span>
          {writeup.program ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-ink-2">{writeup.program}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="truncate">{hostOf(writeup.url)}</span>
        </div>
      </div>
    </article>
  );
}
