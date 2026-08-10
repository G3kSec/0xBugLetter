# Contributing to 0xBugLetter

Thanks for wanting to help. There are three types of contribution, ordered
by how often they come up.

**Most entries in the archive are added by the bot on its own**, every day,
from sources marked `verified: true` in `data/sources.yaml` — see
[bot/README.md](bot/README.md#classification-read-this-part) for how that
works. Everything below applies when you want to add something the bot
won't find on its own (a source that isn't tracked yet, a one-off article,
or fixing a classification it guessed wrong).

---

## 1. Add a writeup by hand

### Inclusion criteria

This is the only thing that really matters, and it's restrictive on
purpose. The value of a curated archive is in what it leaves out.

**Accepted:**

- Writeups by authors recognized in the community, or with demonstrable
  results: paid bounties, assigned CVEs, reports disclosed on official
  platforms.
- Original research from labs and teams with a track record (PortSwigger,
  Assetnote, ProjectDiscovery, Detectify, and equivalents).
- Podcast episodes and talks with verifiable technical content.

**Not accepted:**

- "I made $10,000 in a week" posts with no PoC, no public report, and
  nothing backing the number.
- AI-regurgitated content re-explaining the OWASP Top 10 for the hundredth
  time.
- Estimated, inferred, or "approximate" bounty amounts. If the amount isn't
  public, **the field stays empty**. A made-up number poisons the whole
  archive's metrics.

### How

1. Create `data/writeups/YYYY-MM-DD-short-title.yaml`. The date is the
   article's publication date, not today's — and it has to match the
   `date` field inside (CI checks this).

2. Fill in the fields:

```yaml
title: "Blind SSRF via PDF export"
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

# Bounty — only if the amount is public
is_paid: true
bounty_amount: 5000
currency: "USD"

summary: "One or two sentences of your own, not the article's copy."  # optional

tags:
  - "ssrf"
  - "pdf-export"
```

3. Validate locally and open the PR:

```bash
python .github/scripts/validate.py
```

### About `severity`

For a specific report, it's the severity that was assigned. For research
describing a technique, it's the typical impact of that bug class. If the
article is a guide or a reflection with no concrete bug, use `Info`.

---

## 2. Add or fix a source

Add a block to `data/sources.yaml`:

```yaml
- name: "Source name"
  url: "https://example.com/feed.xml"
  site: "https://example.com"
  category: blog          # blog | platform | researcher | podcast | news
  status: active          # active | stale | broken | no-feed
  verified: true          # recognized author or organization?
  note: "Optional context."
```

`verified: true` isn't a minor detail here — it's the only quality filter
before the bot starts auto-archiving from that source. Don't mark it that
way without having checked who actually publishes there.

**Reporting a broken feed counts too**, and it's the fastest contribution
to review. If a source marked `broken` has a new URL, update it and drop
the flag. If a feed doesn't expose a distinct URL per article (some podcast
hosts do this), the bot skips it automatically — see the Critical Thinking
Podcast note in `data/sources.yaml` as an example of how to document that.

---

## Fixing an auto-archived entry

The bot classifies by keyword, it doesn't read the article — it gets things
wrong. Any YAML in `data/writeups/` that starts with the comment
`# Auto-archived by bot/index.py` shipped without human review. If
`bug_type` or `severity` is wrong, or `bounty_amount` is missing because
the bot can't infer it, it's just a regular file: edit it and send the PR,
like any other change.

---

## 3. Changes to the site

Normal development PR against `web/`. Before sending it:

```bash
cd web
npx tsc --noEmit
npx eslint .
npm run build
```

---

## Adding a taxonomy value

The `bug_type`, `severity`, and `platform` lists are closed. If every
writeup invents its own category, the filters stop being useful for
anything.

Adding a value means touching **two files in the same PR**:

1. `data/taxonomy.yaml` — read by the Python validator
2. `web/src/lib/types.ts` — read by the site

The build fails on purpose if the two lists don't match. That's what forces
the discussion about whether the new category is actually needed.
