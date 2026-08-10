import type { Metadata } from "next";

import { CodeBlock, Step } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Bot setup",
  description:
    "How to connect the 0xBugLetter bot to your Discord server with a webhook and a GitHub Action.",
};

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Bot</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Get writeups in Discord
        </h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          The bot runs as a GitHub Action, checks the feeds once a day and posts
          what&rsquo;s new to a Discord channel. No server, no hosting — it runs on
          the free Actions tier.
        </p>
      </header>

      <ol className="flex flex-col gap-6">
        <Step n={1} title="Create a webhook in your server">
          <p>
            In Discord:{" "}
            <strong className="text-ink">
              Channel settings → Integrations → Webhooks → New webhook
            </strong>
            . Name it, pick the channel you want the posts in, and copy the URL.
          </p>
          <p className="rounded-sm border border-medium/30 bg-medium-bg px-3 py-2 text-medium">
            That URL is a credential. Anyone who has it can post to your channel
            — don&rsquo;t paste it into an issue and don&rsquo;t commit it.
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
            . The workflow is already configured; all it needs is the credential.
          </p>
        </Step>

        <Step n={3} title="Store the webhook as a secret">
          <p>
            In your fork:{" "}
            <strong className="text-ink">
              Settings → Secrets and variables → Actions → New repository secret
            </strong>
            .
          </p>
          <CodeBlock title="Secret">
            {`Name:   DISCORD_WEBHOOK
Value:  https://discord.com/api/webhooks/...`}
          </CodeBlock>
        </Step>

        <Step n={4} title="Adjust the schedule (optional)">
          <p>
            It runs at 01:00 UTC and posts up to 3 articles a day. Change it in
            the workflow:
          </p>
          <CodeBlock title=".github/workflows/post.yml">
            {`on:
  schedule:
    - cron: "0 1 * * *"   # daily, 01:00 UTC
  workflow_dispatch:       # can also be triggered by hand`}
          </CodeBlock>
          <p>
            The daily cap lives in{" "}
            <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
              MAX_DAILY
            </code>{" "}
            inside{" "}
            <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
              bot/index.py
            </code>
            .
          </p>
        </Step>

        <Step n={5} title="Try it">
          <p>
            Open the <strong className="text-ink">Actions</strong> tab in your
            fork, pick the <em>Daily Post</em> workflow and hit{" "}
            <strong className="text-ink">Run workflow</strong>. If the webhook is
            correct, the posts show up in your channel within seconds.
          </p>
        </Step>
      </ol>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          How it avoids duplicates
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          Every posted URL is appended to{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            bot/sent_urls.txt
          </code>{" "}
          and the Action commits the updated file when it finishes. That&rsquo;s why
          the workflow needs write permission:
        </p>
        <div className="mt-3">
          <CodeBlock title=".github/workflows/post.yml">
            {`permissions:
  contents: write`}
          </CodeBlock>
        </div>
      </section>

      <section className="mt-10 rounded-md border border-line-subtle bg-surface p-5">
        <h2 className="font-semibold tracking-tight">Want it posted elsewhere?</h2>
        <p className="mt-1.5 max-w-[60ch] text-sm text-ink-2">
          Right now the bot only supports Discord. The sending logic is isolated
          in{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            bot/index.py
          </code>
          , so adding another destination is a contained change — and the PR is
          welcome.
        </p>
      </section>
    </div>
  );
}
