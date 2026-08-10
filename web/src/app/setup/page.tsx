import type { Metadata } from "next";

import { CodeBlock, Step } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Bot setup",
  description:
    "How the 0xBugLetter bot auto-archives new writeups and notifies Discord, and how to connect it to your own server.",
};

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Bot</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          How the archive fills itself
        </h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          The bot runs as a GitHub Action once a day. It checks the feeds,
          writes a new entry to the archive for anything genuinely new, and
          posts it to Discord. No server, no hosting, no review queue — it
          commits directly.
        </p>
      </header>

      <section className="mb-12 rounded-md border border-accent-border bg-accent-bg p-5">
        <h2 className="font-semibold tracking-tight">
          This is fully automatic — read this before trusting a classification
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm text-ink-2">
          RSS gives a title and a summary, nothing more. There&rsquo;s no
          reliable way to know the real bug type or severity from that alone,
          so the bot guesses from keywords in the title and summary. It gets
          things wrong sometimes &mdash; a research post about CSS-driven data
          exfiltration could easily get misfiled near XSS by a careless
          pattern, for instance. Every auto-archived entry is marked with a
          comment at the top of its file, and fixing one is just editing the
          YAML and committing the correction. See{" "}
          <a
            href="https://github.com/G3kSec/0xBugLetter/blob/main/bot/README.md#classification-read-this-part"
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent hover:underline"
          >
            the classification notes
          </a>{" "}
          for the exact rules.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          How it decides what to archive
        </h2>
        <p className="mb-4 max-w-[62ch] text-ink-2">
          Three rules do the work, and each exists because a simpler version
          behaved badly.
        </p>

        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <h3 className="font-semibold tracking-tight">
              Only sources marked <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">verified: true</code>
            </h3>
            <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
              This is the one guardrail standing in for the human judgment a
              manual curator used to apply per article. Medium and other
              low-signal aggregators were removed from{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                sources.yaml
              </code>{" "}
              for exactly this reason.
            </p>
          </div>

          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <h3 className="font-semibold tracking-tight">
              One article per source, per pass
            </h3>
            <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
              The bot cycles through the sources instead of walking the file
              top to bottom. Without this, whichever feed sits first in{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                sources.yaml
              </code>{" "}
              takes every slot &mdash; in practice PortSwigger consumed all
              three every day and the sources further down were never
              reached.
            </p>
          </div>

          <div className="rounded-md border border-line-subtle bg-surface p-4">
            <h3 className="font-semibold tracking-tight">
              Anything older than 45 days is backlog
            </h3>
            <p className="mt-1.5 max-w-[62ch] text-sm text-ink-2">
              Several of these feeds still expose posts from 2017&ndash;2023.
              A feed being new to the bot doesn&rsquo;t make its archive
              news, so old entries are skipped rather than added as a
              &ldquo;new read&rdquo;. This also stops a freshly added source
              from dumping years of history into the archive at once.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          How it avoids duplicates
        </h2>
        <p className="max-w-[62ch] text-ink-2">
          There&rsquo;s no separate history file. Before writing anything, the
          bot scans every file already in{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            data/writeups/
          </code>{" "}
          and builds a set of URLs already archived &mdash; whether the bot
          wrote that entry or a human did. If a URL is already there, it&rsquo;s
          skipped. The archive is the state.
        </p>
        <p className="mt-3 max-w-[62ch] text-ink-2">
          One consequence: a feed has to expose a real, distinct URL per
          entry for this to work. A couple of podcast hosts don&rsquo;t
          &mdash; every episode shares the same homepage link &mdash; and for
          those the bot skips the entire source rather than silently losing
          episodes to a false duplicate match.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">
          Run it on your own server
        </h2>

        <ol className="flex flex-col gap-6">
          <Step n={1} title="Create a webhook in your server">
            <p>
              In Discord:{" "}
              <strong className="text-ink">
                Channel settings → Integrations → Webhooks → New webhook
              </strong>
              . Name it, pick the channel you want the posts in, and copy the
              URL.
            </p>
            <p className="rounded-sm border border-medium/30 bg-medium-bg px-3 py-2 text-medium">
              That URL is a credential. Anyone who has it can post to your
              channel &mdash; don&rsquo;t paste it into an issue and don&rsquo;t
              commit it.
            </p>
          </Step>

          <Step n={2} title="Fork the repository">
            <p>
              Fork{" "}
              <a
                href="https://github.com/G3kSec/0xBugLetter"
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent hover:underline"
              >
                G3kSec/0xBugLetter
              </a>
              . The workflow is already configured; all it needs is the
              credential. Note that running your own fork means your fork
              archives independently &mdash; it&rsquo;s a separate copy of
              the data, not a mirror.
            </p>
          </Step>

          <Step n={3} title="Store the webhook as a secret">
            <p>
              In your fork:{" "}
              <strong className="text-ink">
                Settings → Secrets and variables → Actions → New repository
                secret
              </strong>
              .
            </p>
            <CodeBlock title="Secret">
              {`Name:   DISCORD_WEBHOOK
Value:  https://discord.com/api/webhooks/...`}
            </CodeBlock>
          </Step>

          <Step n={4} title="Try it locally first">
            <p>
              Before wiring up the real webhook, see exactly what the bot
              would archive and how it classifies each entry &mdash; no
              webhook required, nothing written:
            </p>
            <CodeBlock title="Terminal">
              {`pip install -r bot/requirements.txt
python bot/index.py --dry-run`}
            </CodeBlock>
          </Step>

          <Step n={5} title="Run it for real">
            <p>
              Open the <strong className="text-ink">Actions</strong> tab in
              your fork, pick the <em>Daily Post</em> workflow and hit{" "}
              <strong className="text-ink">Run workflow</strong>. If the
              webhook is correct, the new entries land in{" "}
              <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
                data/writeups/
              </code>{" "}
              and the posts show up in your channel within seconds.
            </p>
          </Step>
        </ol>
      </section>

      <section className="rounded-md border border-line-subtle bg-surface p-5">
        <h2 className="font-semibold tracking-tight">
          Want it posted somewhere other than Discord?
        </h2>
        <p className="mt-1.5 max-w-[60ch] text-sm text-ink-2">
          Right now the bot only supports Discord. The sending logic is
          isolated in{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            bot/index.py
          </code>
          , so adding another destination is a contained change &mdash; and
          the PR is welcome.
        </p>
      </section>
    </div>
  );
}
