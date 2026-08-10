import type { Metadata } from "next";
import Link from "next/link";

import { Chip } from "@/components/ui";
import { getSources, getWriteupCountsBySource } from "@/lib/content";
import type { Source, SourceCategory, SourceStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Sources",
  description:
    "Every blog, podcast and platform already tracked by 0xBugLetter, with the current health of each feed.",
};

const CATEGORY_LABELS: Record<SourceCategory, string> = {
  blog: "Research & labs",
  platform: "Platforms",
  researcher: "Researchers",
  podcast: "Podcasts",
  news: "Aggregators",
};

const CATEGORY_ORDER: SourceCategory[] = [
  "blog",
  "platform",
  "researcher",
  "podcast",
  "news",
];

const STATUS_INFO: Record<
  SourceStatus,
  { label: string; className: string; meaning: string }
> = {
  active: {
    label: "live",
    className: "text-paid",
    meaning: "Feed works. The bot checks it daily.",
  },
  stale: {
    label: "quiet",
    className: "text-medium",
    meaning: "Feed works, but the source rarely publishes.",
  },
  broken: {
    label: "broken",
    className: "text-critical",
    meaning: "Feed URL fails. The bot skips it until someone fixes the URL.",
  },
  "no-feed": {
    label: "no feed",
    className: "text-ink-3",
    meaning: "Worth reading, but has no RSS. Writeups are added by hand.",
  },
};

export default function SourcesPage() {
  const sources = getSources();
  const counts = getWriteupCountsBySource();

  const monitored = sources.filter(
    (s) => s.status === "active" || s.status === "stale",
  );
  const needsWork = sources.filter(
    (s) => s.status === "broken" || s.status === "no-feed",
  );

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: sources.filter((s) => s.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Coverage</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          Everything already tracked. Check this list before proposing a source
          — if it&rsquo;s here, it&rsquo;s covered.
        </p>
      </header>

      {/* Summary — answers "what works and what doesn't" up front. */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Summary value={sources.length} label="tracked" />
        <Summary value={monitored.length} label="feeds working" tone="paid" />
        <Summary
          value={sources.filter((s) => s.status === "broken").length}
          label="feeds broken"
          tone="critical"
        />
        <Summary
          value={sources.filter((s) => s.status === "no-feed").length}
          label="manual only"
        />
      </section>

      {needsWork.length > 0 ? (
        <div className="mb-8 rounded-md border border-line-subtle bg-surface p-4">
          <p className="label mb-2">What the labels mean</p>
          <dl className="flex flex-col gap-1.5">
            {(["active", "stale", "broken", "no-feed"] as const).map((status) => (
              <div key={status} className="grid grid-cols-[4.5rem_1fr] gap-3 text-sm">
                <dt className={`font-mono text-2xs ${STATUS_INFO[status].className}`}>
                  {STATUS_INFO[status].label}
                </dt>
                <dd className="text-ink-2">{STATUS_INFO[status].meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        {byCategory.map(({ category, items }) => (
          <section key={category}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="label !text-ink-2">{CATEGORY_LABELS[category]}</h2>
              <span className="nums font-mono text-2xs text-ink-3">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((source) => (
                <SourceRow
                  key={source.url}
                  source={source}
                  writeupCount={counts.get(source.name) ?? 0}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-md border border-line-subtle bg-surface p-5">
        <h2 className="font-semibold tracking-tight">Missing something?</h2>
        <p className="mt-1.5 max-w-[60ch] text-sm text-ink-2">
          If you follow a bug bounty blog or podcast that isn&rsquo;t listed, add
          it. The only requirement is that the author is part of the community or
          has demonstrable results. Fixing a broken feed URL counts too — it&rsquo;s
          the fastest contribution to review.
        </p>
        <Link
          href="/contribute"
          className="mt-3 inline-block font-mono text-xs text-accent transition-opacity hover:opacity-70"
        >
          How to contribute →
        </Link>
      </div>
    </div>
  );
}

function Summary({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "paid" | "critical";
}) {
  const toneClass =
    tone === "paid" ? "text-paid" : tone === "critical" ? "text-critical" : "text-ink";

  return (
    <div className="rounded-md border border-line-subtle bg-surface px-3.5 py-3">
      <p className={`nums font-mono text-xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
      <p className="label mt-0.5">{label}</p>
    </div>
  );
}

function SourceRow({
  source,
  writeupCount,
}: {
  source: Source;
  writeupCount: number;
}) {
  const status = STATUS_INFO[source.status];
  const isDegraded = source.status === "broken";

  return (
    <div
      className={`rounded-md border border-line-subtle bg-surface p-4 ${
        isDegraded ? "opacity-75" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={source.site}
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold tracking-tight transition-colors hover:text-accent"
        >
          {source.name}
        </a>
        {source.verified ? <Chip tone="accent">verified</Chip> : null}
        <span className={`ml-auto font-mono text-2xs ${status.className}`}>
          {status.label}
        </span>
      </div>

      {source.note ? (
        <p className="mt-1.5 max-w-[65ch] text-sm text-ink-2">{source.note}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs text-ink-3">
        <span className="nums">
          {writeupCount === 0
            ? "nothing in the archive yet"
            : `${writeupCount} in the archive`}
        </span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{source.url}</span>
      </div>
    </div>
  );
}
