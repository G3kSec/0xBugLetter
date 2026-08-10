"""
0xBugLetter — notification bot.

Reads the feeds declared in data/sources.yaml, works out what hasn't been
published yet and posts it to Discord. Runs as a GitHub Action once a day.

The history file is committed back to the repo, so state survives between
runs without a database.

Usage:
    python bot/index.py              # fetch and post (needs DISCORD_WEBHOOK)
    python bot/index.py --dry-run    # show what it would post, send nothing
    python bot/index.py --limit 5    # override the daily cap for one run
"""

import argparse
import datetime as dt
import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import feedparser
import requests
import yaml
from bs4 import BeautifulSoup

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths resolve against the script location, not the cwd, so the bot behaves
# the same from the repo root or from bot/.
BOT_DIR = Path(__file__).resolve().parent
REPO_ROOT = BOT_DIR.parent
HISTORY_FILE = BOT_DIR / "sent_urls.txt"
SOURCES_FILE = REPO_ROOT / "data" / "sources.yaml"

BOT_NAME = "0xBugLetter"

# How many articles go out per run. Overridable with MAX_DAILY in the
# workflow, or --limit for a one-off.
MAX_DAILY = int(os.environ.get("MAX_DAILY", "3"))

# Anything older than this is treated as backlog, not news.
#
# Without it the bot posts whatever a feed happens to expose: several of these
# feeds still carry entries from 2017-2023, and a newly added source would
# dump its entire archive into the channel over the following weeks.
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "45"))

ENTRIES_PER_FEED = 15
FETCH_TIMEOUT = 20
MAX_RATE_LIMIT_RETRIES = 3

# Some feeds reject the default urllib agent.
USER_AGENT = "0xBugLetter/1.0 (+https://github.com/G3kSec/0xBugLetter)"

COLOR_HEADER = 0xEB459E
COLOR_ARTICLE = 0x46D76F  # matches the site accent

# Sort sentinel for entries with no date. Comparing datetimes directly (never
# calling .timestamp()) keeps this working on Windows, where converting a
# pre-1970 datetime raises OSError.
NO_DATE = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)

# Sources the bot cannot query: `broken` is a feed that fails, `no-feed` is a
# source with no RSS at all.
UNFETCHABLE = {"broken", "no-feed"}

# Tracking parameters that change per request and would defeat URL dedup.
TRACKING_PARAMS = {
    "source", "utm_source", "utm_medium", "utm_campaign", "utm_term",
    "utm_content", "ref", "ref_src", "fbclid", "gclid", "mc_cid", "mc_eid",
}


@dataclass
class Article:
    source: str
    title: str
    url: str
    summary: str
    published: dt.datetime | None

    @property
    def age_days(self) -> float | None:
        if self.published is None:
            return None
        return (dt.datetime.now(dt.timezone.utc) - self.published).total_seconds() / 86400


# ── Loading ──────────────────────────────────────────────────────────────


def load_sources() -> list[dict]:
    """Only the sources with a feed the bot can actually read."""
    with open(SOURCES_FILE, encoding="utf-8") as handle:
        config = yaml.safe_load(handle)

    sources = config.get("sources", [])
    usable = [s for s in sources if s.get("status") not in UNFETCHABLE]

    skipped = len(sources) - len(usable)
    if skipped:
        print(f"skipped {skipped} source(s) with no usable feed")

    return usable


def load_sent_urls() -> set[str]:
    if not HISTORY_FILE.exists():
        return set()
    with open(HISTORY_FILE, encoding="utf-8") as handle:
        return {normalize_url(line.strip()) for line in handle if line.strip()}


def save_urls(urls: list[str]) -> None:
    with open(HISTORY_FILE, "a", encoding="utf-8") as handle:
        for url in urls:
            handle.write(url + "\n")


def normalize_url(url: str) -> str:
    """Strip tracking params so the same article isn't posted twice when a
    feed decorates its links differently between runs."""
    try:
        parts = urlparse(url)
    except ValueError:
        return url

    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in TRACKING_PARAMS]
    return urlunparse(parts._replace(query=urlencode(query), fragment=""))


# ── Fetching ─────────────────────────────────────────────────────────────


def fetch_feed(url: str):
    """Fetch with requests, then hand the bytes to feedparser.

    feedparser.parse(url) does its own fetching with no timeout, which can
    hang a CI run indefinitely, and it swallows HTTP errors into `bozo`
    instead of raising. Doing the request ourselves makes both controllable.
    """
    response = requests.get(
        url, timeout=FETCH_TIMEOUT, headers={"User-Agent": USER_AGENT}
    )
    response.raise_for_status()
    return feedparser.parse(response.content)


def entry_date(entry) -> dt.datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        parsed = entry.get(key)
        if parsed:
            try:
                return dt.datetime(*parsed[:6], tzinfo=dt.timezone.utc)
            except (TypeError, ValueError):
                continue
    return None


def strip_html(text: str) -> str:
    return BeautifulSoup(text or "", "html.parser").get_text().strip()[:350]


def collect_candidates(
    sources: list[dict], sent_urls: set[str]
) -> dict[str, list[Article]]:
    """Every eligible article, grouped by source.

    Unlike a single flat list, this keeps the per-source grouping that
    `select_articles` needs to give each feed a fair turn.
    """
    candidates: dict[str, list[Article]] = {}

    for source in sources:
        name = source["name"]

        try:
            feed = fetch_feed(source["url"])
        except requests.RequestException as error:
            print(f"  {name}: fetch failed — {error}")
            continue

        entries = feed.entries[:ENTRIES_PER_FEED]
        if not entries:
            print(f"  {name}: feed returned no entries")
            continue

        fresh: list[Article] = []
        stale_count = 0

        for entry in entries:
            raw_url = entry.get("link", "")
            if not raw_url:
                continue

            url = normalize_url(raw_url)
            if url in sent_urls:
                continue

            article = Article(
                source=name,
                title=entry.get("title", "Untitled").strip(),
                url=url,
                summary=strip_html(entry.get("summary", "")),
                published=entry_date(entry),
            )

            age = article.age_days
            if age is not None and age > MAX_AGE_DAYS:
                stale_count += 1
                continue

            fresh.append(article)

        # Newest first. Entries with no date sort last: we can't judge their
        # age, so they shouldn't displace something we know is recent.
        fresh.sort(key=lambda a: a.published or NO_DATE, reverse=True)

        note = f" ({stale_count} older than {MAX_AGE_DAYS}d)" if stale_count else ""
        print(f"  {name}: {len(fresh)} new{note}")

        if fresh:
            candidates[name] = fresh

    return candidates


def select_articles(candidates: dict[str, list[Article]], limit: int) -> list[Article]:
    """Round-robin across sources: every source gets one slot before any
    source gets a second.

    Iterating sources in file order and stopping at the cap meant the first
    source in sources.yaml consumed the whole quota. With 8 sources and 3
    slots a day, the ones at the bottom of the file were never reached.
    """
    selected: list[Article] = []
    queues = {name: list(items) for name, items in candidates.items()}

    while len(selected) < limit and queues:
        # One pass = one article per source, so nobody gets seconds until
        # everybody has had firsts. Within a pass the most recent article
        # goes first, so the ordering in the channel still reads newest-down.
        order = sorted(queues, key=lambda n: queues[n][0].published or NO_DATE, reverse=True)

        for name in order:
            if len(selected) >= limit:
                break
            selected.append(queues[name].pop(0))
            if not queues[name]:
                del queues[name]

    return selected


# ── Posting ──────────────────────────────────────────────────────────────


def post(webhook_url: str, payload: dict, attempt: int = 1) -> bool:
    try:
        response = requests.post(webhook_url, json=payload, timeout=FETCH_TIMEOUT)
    except requests.RequestException as error:
        print(f"  network error: {error}")
        return False

    if response.status_code == 429:
        if attempt > MAX_RATE_LIMIT_RETRIES:
            print("  gave up after repeated rate limits")
            return False

        # Discord normally returns JSON here, but an edge proxy can answer
        # with HTML — don't let that crash the run.
        try:
            retry_after = float(response.json().get("retry_after", 5))
        except (ValueError, AttributeError):
            retry_after = 5.0

        print(f"  rate limited, waiting {retry_after}s (attempt {attempt})")
        time.sleep(retry_after)
        return post(webhook_url, payload, attempt + 1)

    if response.status_code not in (200, 204):
        print(f"  HTTP {response.status_code}: {response.text[:120]}")
        return False

    # Discord allows ~5 requests/s per webhook.
    time.sleep(1)
    return True


def header_payload(count: int) -> dict:
    today = dt.date.today().strftime("%d %b %Y")
    plural = "s" if count > 1 else ""
    return {
        "username": BOT_NAME,
        "embeds": [
            {
                "title": "0xBugLetter :: Daily Drop",
                "description": (
                    f"**{today}** — `{count}` new read{plural} from the bug bounty world.\n"
                    "Hunt smart. Break things (legally). Get paid."
                ),
                "color": COLOR_HEADER,
            }
        ],
    }


def article_payload(article: Article) -> dict:
    embed = {
        "title": article.title[:256],
        "url": article.url,
        "color": COLOR_ARTICLE,
        "footer": {"text": article.source},
    }
    if article.summary:
        embed["description"] = article.summary
    if article.published:
        embed["timestamp"] = article.published.isoformat()
    return {"username": BOT_NAME, "embeds": [embed]}


# ── Entry point ──────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(description="0xBugLetter Discord bot")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="show what would be posted without sending anything",
    )
    parser.add_argument(
        "--limit", type=int, default=None, help="override the per-run article cap"
    )
    args = parser.parse_args()

    limit = args.limit if args.limit is not None else MAX_DAILY

    webhook_url = os.environ.get("DISCORD_WEBHOOK")
    if not webhook_url and not args.dry_run:
        print("DISCORD_WEBHOOK is not set. Use --dry-run to test without it.")
        return 1

    sources = load_sources()
    sent_urls = load_sent_urls()

    print(f"\nchecking {len(sources)} feeds (history: {len(sent_urls)} urls)")
    candidates = collect_candidates(sources, sent_urls)

    total = sum(len(items) for items in candidates.values())
    if total == 0:
        print("\nnothing new today")
        return 0

    selected = select_articles(candidates, limit)
    print(f"\nselected {len(selected)} of {total} candidates across {len(candidates)} sources")

    if args.dry_run:
        print("\n--- dry run, nothing sent ---")
        for article in selected:
            age = article.age_days
            age_text = f"{age:.0f}d ago" if age is not None else "no date"
            print(f"  [{article.source}] {article.title[:60]} ({age_text})")
        return 0

    # The header only makes sense alongside actual articles, so it goes out
    # with the first one rather than up front — a run where every send fails
    # shouldn't leave a lone "3 new reads" banner in the channel.
    #
    # It's attempted once: if the webhook is dead, retrying the header before
    # every article just doubles the failed requests.
    sent: list[str] = []
    header_attempted = False

    for article in selected:
        if not header_attempted:
            header_attempted = True
            post(webhook_url, header_payload(len(selected)))

        if post(webhook_url, article_payload(article)):
            print(f"  sent: {article.title[:60]}")
            sent.append(article.url)
        else:
            print(f"  failed: {article.title[:60]}")

    if sent:
        save_urls(sent)

    print(f"\n{len(sent)}/{len(selected)} articles sent")
    return 0 if sent else 1


if __name__ == "__main__":
    raise SystemExit(main())
