import type { Metadata } from "next";
import Link from "next/link";

import { CodeBlock, Step } from "@/components/code-block";
import { BUG_TYPES, PLATFORMS, SEVERITIES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "How to add a writeup or a source to 0xBugLetter through a pull request.",
};

export default function ContributePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Community</p>
        <h1 className="text-3xl font-semibold tracking-tight">Contribute</h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          The archive is maintained by the community. Adding a writeup means
          creating a YAML file and opening a pull request — no code required.
        </p>
      </header>

      {/* ── Inclusion criteria ─────────────────────────────────────── */}
      <section className="mb-10 rounded-md border border-accent-border bg-accent-bg p-5">
        <h2 className="font-semibold tracking-tight">What gets in, and what doesn&rsquo;t</h2>
        <p className="mt-2 text-sm text-ink-2">
          This is the only rule that really matters, and it&rsquo;s deliberately
          strict:
        </p>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
          <Rule ok>
            Writeups by authors known in the community, or with demonstrable
            results: paid bounties, assigned CVEs, reports disclosed on official
            platforms.
          </Rule>
          <Rule ok>
            Original research from labs and security teams with a track record.
          </Rule>
          <Rule ok>
            Podcast episodes and talks with verifiable technical content.
          </Rule>
          <Rule>
            &ldquo;I made $10,000 in a week&rdquo; posts with no PoC, no public report
            and nothing backing the number.
          </Rule>
          <Rule>
            AI-regurgitated content re-explaining the OWASP Top 10 for the
            hundredth time.
          </Rule>
          <Rule>
            Estimated, inferred or &ldquo;approximate&rdquo; bounty amounts. If the
            number isn&rsquo;t public, the field stays empty.
          </Rule>
        </ul>
      </section>

      {/* ── Steps ──────────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">Add a writeup</h2>

        <ol className="flex flex-col gap-6">
          <Step n={1} title="Create the file">
            <p>
              In{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                data/writeups/
              </code>
              , named{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                YYYY-MM-DD-short-title.yaml
              </code>
              . The date is the article&rsquo;s publication date, not today&rsquo;s.
            </p>
          </Step>

          <Step n={2} title="Fill in the fields">
            <CodeBlock title="data/writeups/2026-07-15-ssrf-example.yaml">
              {`title: "Blind SSRF via PDF export"
author: "@handle"
author_url: "https://twitter.com/handle"   # optional
date: "2026-07-15"
url: "https://example.com/writeup"
source: "HackerOne"

# Classification
bug_type: "SSRF"
severity: "High"
cwe: "CWE-918"                             # optional

# Program
platform: "HackerOne"
program: "Example Inc."                    # optional

# Bounty — only when the amount is public
is_paid: true
bounty_amount: 5000
currency: "USD"

summary: "One or two sentences of your own, not the article's blurb."  # optional

tags:
  - "ssrf"
  - "pdf-export"`}
            </CodeBlock>
          </Step>

          <Step n={3} title="Open the pull request">
            <p>
              CI validates the schema, checks the URL resolves and confirms it
              isn&rsquo;t a duplicate. If something fails, the bot comments on the PR
              with what to fix.
            </p>
          </Step>
        </ol>
      </section>

      {/* ── Allowed values ─────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Allowed values</h2>
        <p className="mb-5 max-w-[62ch] text-sm text-ink-2">
          The taxonomies are closed on purpose: if every writeup invents its own
          category, the filters stop being useful. Adding a value means editing{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            data/taxonomy.yaml
          </code>{" "}
          and{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            web/src/lib/types.ts
          </code>{" "}
          in the same PR — the build fails if they drift apart, which is what
          forces the discussion.
        </p>

        <div className="flex flex-col gap-5">
          <ValueList title="severity" values={[...SEVERITIES]} />
          <ValueList title="platform" values={[...PLATFORMS]} />
          <ValueList title="bug_type" values={[...BUG_TYPES]} />
        </div>
      </section>

      {/* ── Add a source ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Add a source</h2>
        <p className="mb-4 max-w-[62ch] text-sm text-ink-2">
          Check the{" "}
          <Link href="/sources" className="text-accent hover:underline">
            sources page
          </Link>{" "}
          first — if it&rsquo;s already tracked, there&rsquo;s nothing to do. Otherwise add
          a block to{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            data/sources.yaml
          </code>
          :
        </p>
        <CodeBlock title="data/sources.yaml">
          {`- name: "Source name"
  url: "https://example.com/feed.xml"
  site: "https://example.com"
  category: blog          # blog | platform | researcher | podcast | news
  status: active          # active | stale | broken | no-feed
  verified: true          # known author or organisation?
  note: "Optional context."`}
        </CodeBlock>
        <p className="mt-4 max-w-[62ch] text-sm text-ink-2">
          Reporting a broken feed counts as a contribution too — and it&rsquo;s the
          fastest one to review.
        </p>
      </section>
    </div>
  );
}

function Rule({ ok = false, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1rem_1fr] gap-2.5">
      <span
        aria-hidden="true"
        className={`mt-[0.4rem] size-2 shrink-0 rounded-full ${ok ? "bg-paid" : "bg-critical"}`}
      />
      <span>
        <span className="sr-only">{ok ? "Accepted: " : "Not accepted: "}</span>
        {children}
      </span>
    </li>
  );
}

function ValueList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="label pb-2">{title}</p>
      <div className="flex flex-wrap gap-1">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-sm border border-line-subtle bg-surface px-1.5 py-0.5 font-mono text-2xs text-ink-2"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
