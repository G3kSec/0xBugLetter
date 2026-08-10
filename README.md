# 0xBugLetter

[![Daily Post](https://github.com/G3kSec/0xBugLetter/actions/workflows/post.yml/badge.svg)](https://github.com/G3kSec/0xBugLetter/actions/workflows/post.yml)
[![Validate](https://github.com/G3kSec/0xBugLetter/actions/workflows/validate.yml/badge.svg)](https://github.com/G3kSec/0xBugLetter/actions/workflows/validate.yml)

A self-curating archive of bug bounty writeups and research.

**[0xbugletter.g3ksec.xyz](https://0xbugletter.g3ksec.xyz/)**

## What it is

A GitHub Actions bot checks a short list of verified sources every day,
classifies what's new, and commits it straight into the archive as a YAML
file — no database, no admin panel, no review queue. The site is a static
Next.js build over that same `data/` directory, so the archive and the
website can never drift apart.

Content isn't limited to what the bot finds: anyone can add a writeup, fix a
broken source, or correct a bad classification through a pull request. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Structure

```
├── web/          Next.js site (SSG). Reads data/ at build time.
├── data/         The content. This is what gets contributed to.
│   ├── writeups/     One YAML file per curated writeup
│   ├── sources.yaml  Feeds the bot monitors, and their trust status
│   └── taxonomy.yaml Closed lists — bug types, severities, platforms
├── bot/          The archiving bot (Python). Runs as a GitHub Action.
└── .github/
    ├── workflows/    post.yml (daily bot run) · validate.yml (PR checks)
    └── scripts/      start.sh (bot) · validate.py (content validator)
```

## The bot

Runs once a day, archives up to 3 new entries, and posts each one to
Discord. It only pulls from sources marked `verified: true` — that's the one
guardrail standing in for the manual review a human curator used to do per
article. Classification (`bug_type`, `severity`, `platform`) is keyword
matching, not a read of the article, and it says so on every entry it writes.

Full details — the execution flow, why round-robin selection exists, why
there's a 45-day recency window, how it avoids duplicates without a separate
history file — are in [bot/README.md](bot/README.md).

## Development

```bash
cd web && npm install && npm run dev
```

The site runs on `http://localhost:3000`. Content loads from `../data`, so
adding a YAML file shows up on reload without restarting the server.

Validate content before opening a PR:

```bash
python .github/scripts/validate.py
```

Add `--urls` to also check that every link resolves.

Try the bot without a webhook or writing anything:

```bash
pip install -r bot/requirements.txt
python bot/index.py --dry-run
```

## Contributing

Most entries in the archive were added by the bot, not by hand. Contribute
directly when you want to add something the bot won't find on its own — a
one-off writeup, a new source, a fix to a wrong classification. The
inclusion criteria and full YAML schema are in
[CONTRIBUTING.md](CONTRIBUTING.md), and they're intentionally strict: the
value of a curated archive is in what it leaves out.

## Security

The site is static with no backend, no accounts, and no cookies — the real
attack surface is content arriving through pull requests. See
[SECURITY.md](SECURITY.md) for the threat model and how untrusted YAML is
validated before it can reach a page.

## Deploying

The Next.js app lives in `web/`, not at the repo root. On Vercel, set
**Root Directory** to `web` when importing the project, and enable
**"Include files outside of the Root Directory in the Build Step"** in
Project Settings → General — without it, the build can't see `../data` and
fails outright (it used to fail silently and deploy an empty site instead;
that's fixed now). No environment variables are needed for the site itself;
`DISCORD_WEBHOOK` is only used by the bot, as a GitHub Actions secret.

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Python 3.11 · GitHub Actions ·
Vercel
