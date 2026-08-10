# The bot

Reads the feeds in `data/sources.yaml`, works out what isn't archived yet,
writes a new entry to `data/writeups/` for it, and posts it to Discord. Runs
as a GitHub Action, once a day at 01:00 UTC.

There is no server, no database, and no separate history file. The archive
itself is the state: an article is "already handled" once a YAML file for its
URL exists in `data/writeups/`, whether the bot wrote it or a human did.

**This is fully automatic — nothing is queued for review.** New entries land
in `data/writeups/` and get committed by the same run that fetches them. Read
[Classification](#classification-read-this-part) below before trusting the
`bug_type`/`severity` on an auto-archived entry for anything that matters.

---

## Execution flow

```
                    ┌──────────────────────────┐
                    │  Trigger                 │
                    │  cron 01:00 UTC          │
                    │  or "Run workflow"       │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │  DISCORD_WEBHOOK set?    │
                    └────────────┬─────────────┘
                          no ────┴──── yes
                           │            │
                     exit 1│            ▼
                           │  ┌──────────────────────────┐
                           │  │  Load data/sources.yaml  │
                           │  │  drop broken / no-feed / │
                           │  │  unverified               │
                           │  └────────────┬─────────────┘
                           │               ▼
                           │  ┌──────────────────────────┐
                           │  │  Scan data/writeups/*.yaml│
                           │  │  → set of archived URLs   │
                           │  └────────────┬─────────────┘
                           │               ▼
                           │  ┌────────────────────────────────────────┐
                           │  │  FOR EACH source                       │
                           │  │    GET feed (20s timeout, own UA)      │
                           │  │    entries share one link? → skip      │
                           │  │      source (can't dedup reliably)     │
                           │  │    take newest 15 entries              │
                           │  │    drop: URL already archived          │
                           │  │    drop: older than MAX_AGE_DAYS       │
                           │  │    sort newest first                    │
                           │  └────────────┬─────────────────────────┘
                           │               ▼
                           │  ┌──────────────────────────┐
                           │  │  Any candidates?         │
                           │  └────────────┬─────────────┘
                           │        no ────┴──── yes
                           │         │            │
                           │   exit 0│            ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  Round-robin select      │
                           │         │  │  one per source per pass │
                           │         │  │  until MAX_DAILY         │
                           │         │  └────────────┬─────────────┘
                           │         │               ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  Classify: bug_type,     │
                           │         │  │  severity, platform      │
                           │         │  │  (keyword match, see     │
                           │         │  │  below)                  │
                           │         │  └────────────┬─────────────┘
                           │         │               ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  Write data/writeups/    │
                           │         │  │  {date}-{slug}.yaml       │
                           │         │  └────────────┬─────────────┘
                           │         │               ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  POST header (once)      │
                           │         │  │  POST each article       │
                           │         │  │  429 → back off, max 3   │
                           │         │  └────────────┬─────────────┘
                           │         │               ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  Action commits the new  │
                           │         │  │  data/writeups/*.yaml     │
                           │         │  └────────────┬─────────────┘
                           ▼         ▼               ▼
                        exit 1    exit 0          exit 0
```

The archive write happens **before** the Discord post and doesn't depend on
it succeeding. If Discord is down, the entry still gets archived and
committed — Discord is a notification side-channel now, not the source of
truth. A failed post is logged and not retried; the entry already exists, so
next run's dedup check would just skip it again anyway.

---

## Classification — read this part

RSS gives a title and a summary, nothing more. There's no reliable way to
know the actual bug type, severity, or bounty amount from that alone — a
human curator used to read the article. This is keyword matching over the
title and summary text (see `BUG_TYPE_PATTERNS` in `bot/index.py`), and **it
gets things wrong**.

Concretely: *"CSS: the bomb inside your inbox"* is CSS-injection-driven data
exfiltration — hand-classified as `Info Disclosure` when it was curated
manually. A careless rule matching `css` against XSS-like patterns would
misfile it. That's why the XSS pattern requires the literal word `xss`, not
`css`, and why severity defaults to `Info` rather than guessing upward when
unsure. The classifier is built to under-commit, not to be clever.

`bounty_amount`, `is_paid`, and `program` are **never** guessed — RSS doesn't
carry that information, and inventing it would break the one rule this
archive doesn't bend on. Those fields stay empty on auto-archived entries
unless someone adds them by hand.

Every auto-archived file is marked at the top:

```yaml
# Auto-archived by bot/index.py from an RSS feed.
# bug_type/severity/platform are keyword-guessed, not human-verified —
# see CLASSIFICATION NOTES in bot/index.py. Fix by editing this file
# directly and committing the correction.
```

**If a classification is wrong, just edit the file and commit the fix.**
There's no special process — it's a YAML file like any other.

### The one guardrail: verified sources only

The bot only archives from sources marked `verified: true` in
`data/sources.yaml`. That's what stands in for the human judgment a manual
curator used to apply per-article — not "is this specific post good," but
"is this publisher one whose bylines are worth trusting by default." Medium
and other low-signal aggregators were removed from `sources.yaml` for exactly
this reason; don't re-add a source as `verified: true` without actually
checking who's behind it.

---

## Running it locally

```bash
pip install -r bot/requirements.txt
python bot/index.py --dry-run
```

`--dry-run` needs no webhook and writes/sends nothing. It shows exactly what
would be archived, including the classification guess:

```
checking 7 feeds (archive: 31 entries)
  PortSwigger Research: 0 new (1 older than 45d)
  Intigriti: 5 new (6 older than 45d)
  Critical Thinking Podcast: feed doesn't expose per-entry URLs (skipped)
  ...

selected 3 of 7 candidates across 2 sources

--- dry run, nothing written or sent ---
  [Intigriti] Intigriti named new provider for Adobe's Bug Bounty... (6d ago)
      -> bug_type=Methodology severity=Info platform=Intigriti
```

This is also the fastest way to check a source you're proposing: add it to
`data/sources.yaml`, run the dry run, and see whether the bot can read it and
dedup it correctly. CI runs the same command on every PR.

To actually archive and post:

```bash
DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." python bot/index.py
```

| Flag | What it does |
| --- | --- |
| `--dry-run` | Classify and select, write and send nothing. No webhook needed. |
| `--limit N` | Override the per-run cap for one run. |

---

## Configuration

| Setting | Default | Where |
| --- | --- | --- |
| `DISCORD_WEBHOOK` | — | GitHub Actions secret. Required to post. |
| `MAX_DAILY` | `3` | Env var. Entries archived + posted per run. |
| `MAX_AGE_DAYS` | `45` | Env var. Older than this counts as backlog. |
| Schedule | `0 1 * * *` | `cron` in `.github/workflows/post.yml` |

---

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Entries archived (and posted, best-effort), or nothing new. |
| `1` | No webhook configured. |

---

## Failure behaviour

| Situation | What happens |
| --- | --- |
| One feed is down | Logged, skipped, the run continues with the rest. |
| Feed returns HTML instead of RSS | Zero entries, logged, skipped. Mark it `broken` in `sources.yaml`. |
| Feed doesn't expose per-entry URLs | Every entry shares one `link` — the whole source is skipped, logged, so a duplicate can't slip past dedup. Add entries from that source by hand. |
| Discord rate limits (429) | Waits `retry_after`, retries up to 3 times, then gives up on that message — the archive entry stays either way. |
| Webhook is invalid | Archiving still happens; every Discord post fails and is logged. |

---

## Adding a source

Check the `/sources` page on the site first — if it's already tracked,
there's nothing to do. Otherwise edit `data/sources.yaml`, then verify before
opening the PR:

```bash
python bot/index.py --dry-run
python .github/scripts/validate.py --urls
```

If the dry run shows `0 new` and the feed has recent posts, the feed URL is
probably wrong. If it shows `feed returned no entries`, the URL is serving
something that isn't RSS — mark it `broken`. If it shows the per-entry-URL
skip message, the feed can't be auto-archived reliably — mark it with a note
explaining why (see the Critical Thinking Podcast entry in
`data/sources.yaml` for the pattern) and add its content manually instead.

**A source only gets auto-archived if it's `verified: true`.** See
[Classification](#classification-read-this-part) for why that matters more
now than it used to.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full source and writeup
schema.
