import Link from "next/link";

import { WriteupCard } from "@/components/writeup-card";
import { getSources, getWriteups } from "@/lib/content";

export default function HomePage() {
  const writeups = getWriteups();
  const sources = getSources();
  const latest = writeups.slice(0, 6);

  const bugTypes = new Set(writeups.map((w) => w.bugType)).size;
  const liveSources = sources.filter(
    (s) => s.status === "active" || s.status === "stale",
  ).length;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="grid-bg border-b border-line-subtle">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="label mb-4">Curated archive · Bug bounty</p>

          <h1 className="max-w-[20ch] text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            The reading that&rsquo;s worth it,{" "}
            <span className="text-accent">without the noise</span>.
          </h1>

          <p className="mt-5 max-w-[58ch] text-lg text-ink-2">
            A timeline of bug bounty writeups and research. Every entry is
            verified against its source and classified by bug type — so you can
            filter instead of scroll.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/writeups"
              className="rounded-sm bg-accent px-4 py-2 font-mono text-xs font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Browse the archive
            </Link>
            <Link
              href="/setup"
              className="rounded-sm border border-line px-4 py-2 font-mono text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              Set up the bot
            </Link>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-x-8 gap-y-5">
            <Stat value={String(writeups.length)} label="writeups" />
            <Stat value={String(bugTypes)} label="bug types" />
            <Stat value={String(liveSources)} label="live sources" />
          </dl>
        </div>
      </section>

      {/* ── Latest ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <p className="label mb-1">Latest</p>
            <h2 className="text-xl font-semibold tracking-tight">Recently added</h2>
          </div>
          <Link
            href="/writeups"
            className="shrink-0 font-mono text-xs text-accent transition-opacity hover:opacity-70"
          >
            see all →
          </Link>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2">
          {latest.map((writeup) => (
            <WriteupCard key={writeup.slug} writeup={writeup} />
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-5">
          <p className="label mb-1">How it works</p>
          <h2 className="text-xl font-semibold tracking-tight">
            The content lives in the repository
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card
            title="Everything is YAML"
            body="Each writeup is a file in data/writeups/. No database, no admin panel. The change history is the git history."
          />
          <Card
            title="Contributed by PR"
            body="Add a file, open a pull request, and CI validates the schema. If it passes, it lands in the archive with your name on the commit."
          />
          <Card
            title="The bot notifies"
            body="A GitHub Action checks the feeds daily and posts what's new to Discord. The site is the archive; the bot is the notification."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  // The number reads first, but in the DOM <dt> has to precede <dd>:
  // flipped with flex rather than duplicating the text for screen readers.
  return (
    <div className="flex flex-col-reverse">
      <dt className="label">{label}</dt>
      <dd className="nums font-mono text-2xl font-semibold tracking-tight">
        {value}
      </dd>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-line-subtle bg-surface p-5">
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-2">{body}</p>
    </div>
  );
}
