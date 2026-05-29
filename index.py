import os
import time
import requests
import feedparser
import yaml
from bs4 import BeautifulSoup

HISTORY_FILE = "sent_urls.txt"
CONFIG_FILE = "config.yaml"
BOT_NAME = "0xBotNews"
EMBED_COLOR = 0x00B4D8


def load_config():
    with open(CONFIG_FILE) as f:
        return yaml.safe_load(f)


def load_sent_urls():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE) as f:
            return set(line.strip() for line in f if line.strip())
    return set()


def save_url(url):
    with open(HISTORY_FILE, "a") as f:
        f.write(url + "\n")


def strip_html(text):
    return BeautifulSoup(text or "", "html.parser").get_text()[:400]


def send_discord(webhook_url, title, url, source, description=""):
    payload = {
        "username": BOT_NAME,
        "embeds": [{
            "title": title[:256],
            "url": url,
            "description": description,
            "color": EMBED_COLOR,
            "footer": {"text": f"Source: {source}"},
        }]
    }
    resp = requests.post(webhook_url, json=payload, timeout=10)
    time.sleep(1)  # Discord rate limit
    return resp.status_code in (200, 204)


def process_feed(feed_cfg, sent_urls, webhook_url):
    name = feed_cfg["name"]
    url = feed_cfg["url"]

    try:
        feed = feedparser.parse(url)
    except Exception as e:
        print(f"❌ [{name}] Error: {e}")
        return sent_urls

    if not feed.entries:
        print(f"🟡 [{name}] Sin entradas.")
        return sent_urls

    new_count = 0
    for entry in feed.entries[:10]:
        entry_url = entry.get("link", "")
        if not entry_url or entry_url in sent_urls:
            continue

        title = entry.get("title", "Sin título")
        summary = strip_html(entry.get("summary", ""))

        if send_discord(webhook_url, title, entry_url, name, summary):
            print(f"🟢 [{name}] {title[:60]}")
            sent_urls.add(entry_url)
            save_url(entry_url)
            new_count += 1
        else:
            print(f"❌ [{name}] Error enviando: {title[:60]}")

    if new_count == 0:
        print(f"🟡 [{name}] Sin artículos nuevos.")

    return sent_urls


def main():
    webhook_url = os.environ.get("DISCORD_WEBHOOK")
    if not webhook_url:
        raise SystemExit("Error: DISCORD_WEBHOOK no definido.")

    config = load_config()
    sent_urls = load_sent_urls()

    for feed_cfg in config.get("sources", []):
        sent_urls = process_feed(feed_cfg, sent_urls, webhook_url)


if __name__ == "__main__":
    main()
