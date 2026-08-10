"""
0xBugLetter — notification bot and auto-curator.

Reads the feeds declared in data/sources.yaml, works out what hasn't been
archived yet, writes a new entry to data/writeups/ for it, and posts it to
Discord. Runs as a GitHub Action once a day.

There is no separate history file. "Already handled" is defined as "already
has a YAML file in data/writeups/" — the archive itself is the state, so the
Discord feed and the curated site can never drift apart.

Classification (bug_type, severity, platform) is done with keyword matching
against the title and summary, since RSS feeds don't carry that metadata.
It is a best-effort guess, not a verified fact — see CLASSIFICATION_NOTES
below before trusting it for anything that matters.

Usage:
    python bot/index.py              # fetch, archive, post (needs DISCORD_WEBHOOK)
    python bot/index.py --dry-run    # show what it would archive, write/send nothing
    python bot/index.py --limit 5    # override the daily cap for one run
"""

import argparse
import datetime as dt
import os
import re
import sys
import time
from dataclasses import dataclass, field
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
DATA_DIR = REPO_ROOT / "data"
WRITEUPS_DIR = DATA_DIR / "writeups"
SOURCES_FILE = DATA_DIR / "sources.yaml"
TAXONOMY_FILE = DATA_DIR / "taxonomy.yaml"

BOT_NAME = "0xBugLetter"

# How many articles get archived + posted per run. Overridable with
# MAX_DAILY in the workflow, or --limit for a one-off.
MAX_DAILY = int(os.environ.get("MAX_DAILY", "3"))

# Anything older than this is treated as backlog, not news.
#
# Without it the bot would archive whatever a feed happens to expose: several
# of these feeds still carry entries from 2017-2023, and a newly added source
# would dump its entire archive into the repo over the following weeks.
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

# Only these sources feed the archive. Everything currently active is
# `verified: true` (Medium and other low-signal aggregators were removed
# deliberately) — this is the one guardrail standing in for the human
# judgment a manual curator used to apply per-article.
REQUIRE_VERIFIED = True

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
    feed_tags: list[str] = field(default_factory=list)

    @property
    def age_days(self) -> float | None:
        if self.published is None:
            return None
        return (dt.datetime.now(dt.timezone.utc) - self.published).total_seconds() / 86400


# ── Loading ──────────────────────────────────────────────────────────────


def load_taxonomy() -> dict:
    with open(TAXONOMY_FILE, encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def load_sources() -> list[dict]:
    """Only the verified sources with a feed the bot can actually read."""
    with open(SOURCES_FILE, encoding="utf-8") as handle:
        config = yaml.safe_load(handle)

    sources = config.get("sources", [])
    usable = [
        s
        for s in sources
        if s.get("status") not in UNFETCHABLE
        and (s.get("verified") or not REQUIRE_VERIFIED)
    ]

    skipped = len(sources) - len(usable)
    if skipped:
        print(f"skipped {skipped} source(s): no usable feed, or not verified")

    return usable


def normalize_url(url: str) -> str:
    """Strip tracking params so the same article isn't archived twice when a
    feed decorates its links differently between runs."""
    try:
        parts = urlparse(url)
    except ValueError:
        return url

    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in TRACKING_PARAMS]
    return urlunparse(parts._replace(query=urlencode(query), fragment=""))


def load_archived_urls() -> set[str]:
    """Every URL already present in data/writeups/.

    This is the single source of truth for "already handled" — there is no
    separate history file. An article that's already archived (by the bot or
    by hand) is simply skipped, whether or not it was ever posted to Discord.
    """
    if not WRITEUPS_DIR.exists():
        return set()

    urls: set[str] = set()
    for path in WRITEUPS_DIR.glob("*.yaml"):
        with open(path, encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
        if isinstance(data, dict) and isinstance(data.get("url"), str):
            urls.add(normalize_url(data["url"]))

    return urls


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
    return BeautifulSoup(text or "", "html.parser").get_text().strip()


def collect_candidates(
    sources: list[dict], archived_urls: set[str]
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

        # Some feeds (this podcast host, notably) don't expose a per-episode
        # URL at all — `link` is just the show's homepage on every entry, and
        # the only per-item identifier is an opaque internal guid, not a URL.
        # Archiving that would give every episode the same url, so the
        # second one silently disappears: load_archived_urls() already knows
        # that url from the first, so it never even shows up as a candidate,
        # no error, no log — a duplicate the whole pipeline is designed to
        # catch, just via a channel it can't check. Bail out for the whole
        # source instead of writing something dedup can't protect against.
        distinct_links = {e.get("link") for e in entries if e.get("link")}
        if len(distinct_links) < len(entries) * 0.5:
            print(
                f"  {name}: feed doesn't expose per-entry URLs "
                f"({len(distinct_links)} distinct link(s) across {len(entries)} entries) — skipped"
            )
            continue

        fresh: list[Article] = []
        stale_count = 0

        for entry in entries:
            raw_url = entry.get("link", "")
            if not raw_url:
                continue

            url = normalize_url(raw_url)
            if url in archived_urls:
                continue

            feed_tags = [
                t.get("term", "").strip()
                for t in entry.get("tags", [])
                if t.get("term")
            ]

            article = Article(
                source=name,
                title=entry.get("title", "Untitled").strip(),
                url=url,
                summary=strip_html(entry.get("summary", ""))[:400],
                published=entry_date(entry),
                feed_tags=feed_tags,
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
        # goes first, so the ordering still reads newest-down.
        order = sorted(queues, key=lambda n: queues[n][0].published or NO_DATE, reverse=True)

        for name in order:
            if len(selected) >= limit:
                break
            selected.append(queues[name].pop(0))
            if not queues[name]:
                del queues[name]

    return selected


# ── Classification ───────────────────────────────────────────────────────
#
# CLASSIFICATION NOTES — read before trusting this for anything that matters.
#
# RSS gives us a title and a summary, nothing more. There is no reliable way
# to know the actual bug type, severity, or bounty amount from that alone —
# a human curator reads the article. This is keyword matching over the title
# and summary text, and it gets things wrong in ways a careless pattern would
# miss. Concretely: "CSS: the bomb inside your inbox" is CSS-injection-driven
# data exfiltration, hand-classified as Info Disclosure — a naive rule
# matching "css" against XSS-like patterns would misfile it. That's why the
# XSS pattern below requires the literal word "xss", not "css" or generic
# "cross-site" text, and why severity defaults to Info rather than guessing
# upward. When in doubt, this classifier under-commits.
#
# bounty_amount / is_paid / program are never inferred here — RSS never
# carries that information, and guessing would violate the one rule this
# archive can't bend on: no invented numbers.

# Ordered most-specific first, since some titles match multiple patterns and
# the first hit wins (e.g. "SSRF via GraphQL" should read as SSRF, the more
# concrete finding, not the transport it rode in on).
BUG_TYPE_PATTERNS: list[tuple[str, str]] = [
    (r"\bcrlf\b|smuggl|\bdesync\b", "Request Smuggling"),
    (r"\bsaml\b", "SAML"),
    (r"\boauth\b", "OAuth"),
    (r"\bgraphql\b", "GraphQL"),
    (r"\bwebsocket", "WebSocket"),
    (r"\bssrf\b|server-side request forgery", "SSRF"),
    (r"\bidor\b|insecure direct object", "IDOR"),
    (r"\bsqli\b|sql injection", "SQLi"),
    (r"\bxxe\b|xml external entit", "XXE"),
    (r"\bssti\b|template injection", "SSTI"),
    (r"prototype pollution", "Prototype Pollution"),
    (r"deserializ", "Deserialization"),
    (r"cache poison", "Cache Poisoning"),
    (r"\bcsrf\b|cross-site request forgery", "CSRF"),
    (r"open redirect", "Open Redirect"),
    (r"race condition", "Race Condition"),
    (r"file upload", "File Upload"),
    (r"subdomain takeover", "Subdomain Takeover"),
    (r"\bxss\b|cross-site scripting", "XSS"),
    (r"privilege escalation|broken access control", "Access Control"),
    (r"auth(?:entication)? bypass", "Auth Bypass"),
    (r"business logic", "Business Logic"),
    (r"s3 bucket|cloud misconfig|aws misconfig", "Cloud Misconfig"),
    (r"supply chain", "Supply Chain"),
    (r"\bllm\b|prompt injection|\bagentic\b|\bagent\b.*\b(ai|llm)\b", "LLM / AI"),
    (r"subdomain enum|\brecon\b|\bosint\b", "Recon"),
    (r"\brce\b|remote code execution", "RCE"),
]

SEVERITY_CRITICAL = re.compile(
    r"pre-auth(?:enticated)? rce|unauthenticated rce|critical vulnerabilit", re.I
)
SEVERITY_HIGH = re.compile(
    r"account takeover|full compromise|\bhigh severity\b", re.I
)


def classify_bug_type(article: Article, allowed: list[str]) -> str:
    text = f"{article.title} {article.summary}".lower()

    for pattern, bug_type in BUG_TYPE_PATTERNS:
        if bug_type not in allowed:
            continue
        if re.search(pattern, text, re.I):
            return bug_type

    # Most of what these particular sources publish is research, methodology
    # or industry commentary rather than a single reported bug — "Methodology"
    # is the honest default, not "Info Disclosure" or a guess.
    return "Methodology" if "Methodology" in allowed else allowed[-1]


def classify_severity(article: Article, allowed: list[str]) -> str:
    text = f"{article.title} {article.summary}"

    if SEVERITY_CRITICAL.search(text) and "Critical" in allowed:
        return "Critical"
    if SEVERITY_HIGH.search(text) and "High" in allowed:
        return "High"
    return "Info" if "Info" in allowed else allowed[-1]


def resolve_platform(source_name: str, allowed: list[str]) -> str:
    for platform in allowed:
        if platform == "Independent":
            continue
        if source_name.lower().startswith(platform.lower()):
            return platform
    return "Independent" if "Independent" in allowed else allowed[0]


# ── Archiving ────────────────────────────────────────────────────────────


def slugify(title: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:max_len].rstrip("-") or "untitled"


def unique_slug(date: str, title: str) -> str:
    base = f"{date}-{slugify(title)}"
    candidate = base
    suffix = 2
    while (WRITEUPS_DIR / f"{candidate}.yaml").exists():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def yaml_string(value: str) -> str:
    # A double-quoted YAML scalar can technically contain a literal newline
    # (it folds to a space per spec), but relying on that is fragile and it
    # reads like a formatting bug in every diff. None of these fields need
    # real line breaks, so collapse whitespace before quoting.
    collapsed = re.sub(r"\s+", " ", value).strip()
    return '"' + collapsed.replace("\\", "\\\\").replace('"', '\\"') + '"'


def build_tags(article: Article, bug_type: str) -> list[str]:
    tags = [slugify(bug_type, max_len=40)]
    for tag in article.feed_tags:
        cleaned = slugify(tag, max_len=40)
        if cleaned and cleaned not in tags and len(tags) < 5:
            tags.append(cleaned)
    return tags


def write_writeup(article: Article, bug_type: str, severity: str, platform: str) -> Path:
    date = (article.published or dt.datetime.now(dt.timezone.utc)).strftime("%Y-%m-%d")
    slug = unique_slug(date, article.title)
    path = WRITEUPS_DIR / f"{slug}.yaml"

    lines = [
        "# Auto-archived by bot/index.py from an RSS feed.",
        "# bug_type/severity/platform are keyword-guessed, not human-verified —",
        "# see CLASSIFICATION NOTES in bot/index.py. Fix by editing this file",
        "# directly and committing the correction.",
        "",
        f"title: {yaml_string(article.title)}",
        f"author: {yaml_string(article.source)}",
        f"date: {yaml_string(date)}",
        f"url: {yaml_string(article.url)}",
        f"source: {yaml_string(article.source)}",
        "",
        "# Classification — auto-guessed, see note above",
        f"bug_type: {yaml_string(bug_type)}",
        f"severity: {yaml_string(severity)}",
        "",
        "# Program",
        f"platform: {yaml_string(platform)}",
    ]

    if article.summary:
        lines += ["", f"summary: {yaml_string(article.summary)}"]

    tags = build_tags(article, bug_type)
    lines += ["", "tags:"]
    lines += [f'  - "{tag}"' for tag in tags]
    lines.append("")

    WRITEUPS_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


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
                    f"**{today}** — `{count}` new read{plural}, added to the archive.\n"
                    "Hunt smart. Break things (legally). Get paid."
                ),
                "color": COLOR_HEADER,
            }
        ],
    }


def article_payload(article: Article, bug_type: str, severity: str) -> dict:
    embed = {
        "title": article.title[:256],
        "url": article.url,
        "color": COLOR_ARTICLE,
        "footer": {"text": f"{article.source} · {bug_type} · {severity}"},
    }
    if article.summary:
        embed["description"] = article.summary[:350]
    if article.published:
        embed["timestamp"] = article.published.isoformat()
    return {"username": BOT_NAME, "embeds": [embed]}


# ── Entry point ──────────────────────────────────────────────────────────


def main() -> int:
    parser = argparse.ArgumentParser(description="0xBugLetter bot")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="show what would be archived and posted, write and send nothing",
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

    taxonomy = load_taxonomy()
    sources = load_sources()
    archived_urls = load_archived_urls()

    print(f"\nchecking {len(sources)} feeds (archive: {len(archived_urls)} entries)")
    candidates = collect_candidates(sources, archived_urls)

    total = sum(len(items) for items in candidates.values())
    selected = select_articles(candidates, limit) if total else []

    if selected:
        print(f"\nselected {len(selected)} of {total} candidates across {len(candidates)} sources")
    else:
        print("\nnothing new today")
        return 0

    classified = []
    for article in selected:
        bug_type = classify_bug_type(article, taxonomy["bug_types"])
        severity = classify_severity(article, taxonomy["severities"])
        platform = resolve_platform(article.source, taxonomy["platforms"])
        classified.append((article, bug_type, severity, platform))

    if args.dry_run:
        print("\n--- dry run, nothing written or sent ---")
        for article, bug_type, severity, platform in classified:
            age = article.age_days
            age_text = f"{age:.0f}d ago" if age is not None else "no date"
            print(
                f"  [{article.source}] {article.title[:55]} ({age_text})\n"
                f"      -> bug_type={bug_type} severity={severity} platform={platform}"
            )
        return 0

    archived = 0
    posted = 0
    header_attempted = False

    for article, bug_type, severity, platform in classified:
        path = write_writeup(article, bug_type, severity, platform)
        archived += 1
        print(f"  archived: {article.title[:55]} -> {path.name}")

        if not header_attempted:
            header_attempted = True
            post(webhook_url, header_payload(len(classified)))

        if post(webhook_url, article_payload(article, bug_type, severity)):
            posted += 1
        else:
            # The archive entry stays either way: Discord is a notification
            # side-channel now, not the source of truth. A failed post here
            # doesn't get retried next run — the entry already exists, so
            # the dedup check would just skip it again.
            print(f"  discord post failed for: {article.title[:55]}")

    print(f"\n{archived} archived, {posted}/{archived} posted to Discord")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
