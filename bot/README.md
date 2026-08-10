# The bot

Reads the feeds in `data/sources.yaml`, picks what hasn't been posted yet and
sends it to Discord. Runs as a GitHub Action, once a day at 01:00 UTC.

There is no server and no database. State is one text file that the Action
commits back to the repo.

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
                           │  │  drop broken / no-feed   │
                           │  └────────────┬─────────────┘
                           │               ▼
                           │  ┌──────────────────────────┐
                           │  │  Load bot/sent_urls.txt  │
                           │  │  → the "already posted"  │
                           │  │    set                   │
                           │  └────────────┬─────────────┘
                           │               ▼
                           │  ┌──────────────────────────────────────┐
                           │  │  FOR EACH source                     │
                           │  │    GET feed (20s timeout, own UA)    │
                           │  │    take newest 15 entries            │
                           │  │    drop: already sent (URL normalised)│
                           │  │    drop: older than MAX_AGE_DAYS      │
                           │  │    sort newest first                  │
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
                           │         │  │  POST header (once)      │
                           │         │  │  POST each article       │
                           │         │  │  429 → back off, max 3   │
                           │         │  └────────────┬─────────────┘
                           │         │               ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  Append SENT urls only   │
                           │         │  │  to bot/sent_urls.txt    │
                           │         │  └────────────┬─────────────┘
                           │         │               ▼
                           │         │  ┌──────────────────────────┐
                           │         │  │  Action commits history  │
                           │         │  └────────────┬─────────────┘
                           ▼         ▼               ▼
                        exit 1    exit 0    exit 0 (sent) / 1 (all failed)
```

---

## The two rules that shape what gets posted

**Round-robin across sources.** One article per source per pass, so no feed
monopolises the day. Previously the bot walked `sources.yaml` in order and
stopped at the cap — PortSwigger sat first in the file and consumed all three
slots every single day, and the sources at the bottom were never reached at
all.

**A recency window.** Anything older than `MAX_AGE_DAYS` is backlog, not news.
Several of these feeds still expose entries from 2017-2023; without the window
the bot would announce a nine-year-old post as a "new read". It also stops a
newly added source from dumping its entire archive into the channel over the
following weeks.

---

## Running it locally

```bash
pip install -r bot/requirements.txt
python bot/index.py --dry-run
```

`--dry-run` needs no webhook and sends nothing. It fetches the real feeds and
prints exactly what would go out:

```
checking 7 feeds (history: 222 urls)
  PortSwigger Research: 3 new (12 older than 45d)
  ProjectDiscovery: 4 new (11 older than 45d)
  Intigriti: 9 new (6 older than 45d)
  ...

selected 3 of 22 candidates across 4 sources

--- dry run, nothing sent ---
  [PortSwigger Research] CSS: the bomb inside your inbox (3d ago)
  [Critical Thinking Podcast] Episode 186: Is Sol 5.6 SuperHuman... (4d ago)
  [Intigriti] Beyond CVSS: rethinking scoring systems... (4d ago)
```

This is also the fastest way to check a source you're proposing: add it to
`data/sources.yaml`, run the dry run, and see whether the bot can read it. CI
runs the same command on every PR.

To actually post:

```bash
DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." python bot/index.py
```

| Flag | What it does |
| --- | --- |
| `--dry-run` | Fetch and select, send nothing. No webhook needed. |
| `--limit N` | Override the per-run cap for one run. |

---

## Configuration

| Setting | Default | Where |
| --- | --- | --- |
| `DISCORD_WEBHOOK` | — | GitHub Actions secret. Required to post. |
| `MAX_DAILY` | `3` | Env var. Articles per run. |
| `MAX_AGE_DAYS` | `45` | Env var. Older than this counts as backlog. |
| Schedule | `0 1 * * *` | `cron` in `.github/workflows/post.yml` |

To change the cap permanently, set it in the workflow:

```yaml
- name: Run bot
  env:
    DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
    MAX_DAILY: "5"
```

---

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Articles sent, or nothing new to send. |
| `1` | No webhook configured, or every send failed. |

A failed run leaves `sent_urls.txt` untouched, so nothing is silently lost —
the next run retries the same articles.

---

## Failure behaviour

| Situation | What happens |
| --- | --- |
| One feed is down | Logged, skipped, the run continues with the rest. |
| Feed returns HTML instead of RSS | Zero entries, logged, skipped. Mark it `broken` in `sources.yaml`. |
| Discord rate limits (429) | Waits `retry_after`, retries up to 3 times, then gives up on that message. |
| Webhook is invalid | Every send fails, exit 1, history untouched. |
| An article send fails | Its URL is not recorded, so the next run retries it. |

---

## Adding a source

Edit `data/sources.yaml`, then verify before opening the PR:

```bash
python bot/index.py --dry-run
python .github/scripts/validate.py --urls
```

If the dry run shows `0 new` and the feed has recent posts, the feed URL is
probably wrong. If it shows `feed returned no entries`, the URL is serving
something that isn't RSS — mark it `broken` and note what it returns.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the source schema.
