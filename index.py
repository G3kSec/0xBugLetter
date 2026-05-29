import os
import time
import datetime
import requests
import feedparser
import yaml
from bs4 import BeautifulSoup

HISTORY_FILE = "sent_urls.txt"
CONFIG_FILE = "config.yaml"
BOT_NAME = "0xBotNews"
MAX_DAILY = 3
COLOR_HEADER = 0xEB459E   # fuchsia — destacado
COLOR_ARTICLE = 0x00B4D8  # cyber blue


def load_config():
    with open(CONFIG_FILE) as f:
        return yaml.safe_load(f)


def load_sent_urls():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE) as f:
            return set(line.strip() for line in f if line.strip())
    return set()


def save_urls(urls):
    with open(HISTORY_FILE, "a") as f:
        for url in urls:
            f.write(url + "\n")


def strip_html(text):
    return BeautifulSoup(text or "", "html.parser").get_text()[:350]


def post(webhook_url, payload):
    resp = requests.post(webhook_url, json=payload, timeout=10)
    time.sleep(1)
    return resp.status_code in (200, 204)


def send_header(webhook_url, count):
    today = datetime.date.today().strftime("%d %b %Y")
    payload = {
        "username": BOT_NAME,
        "embeds": [{
            "title": f"⚡ 0xBotNews :: Daily Intel Drop",
            "description": (
                f"> 🗓️ **{today}** — `{count}` fresh read{'s' if count > 1 else ''} from the bug bounty underground.\n"
                "> 🎯 Hunt smart. Break things (legally). Get paid. 💸\n"
                "> ━━━━━━━━━━━━━━━━━━━━━━━━"
            ),
            "color": COLOR_HEADER,
        }]
    }
    post(webhook_url, payload)


def send_article(webhook_url, title, url, source, description):
    payload = {
        "username": BOT_NAME,
        "embeds": [{
            "title": title[:256],
            "url": url,
            "description": description,
            "color": COLOR_ARTICLE,
            "footer": {"text": f"📡 {source}"},
        }]
    }
    return post(webhook_url, payload)


def collect_new_articles(config, sent_urls):
    articles = []
    for feed_cfg in config.get("sources", []):
        if len(articles) >= MAX_DAILY:
            break
        name = feed_cfg["name"]
        try:
            feed = feedparser.parse(feed_cfg["url"])
        except Exception as e:
            print(f"❌ [{name}] Error: {e}")
            continue

        for entry in feed.entries[:10]:
            if len(articles) >= MAX_DAILY:
                break
            url = entry.get("link", "")
            if not url or url in sent_urls:
                continue
            title = entry.get("title", "Sin título")
            summary = strip_html(entry.get("summary", ""))
            articles.append((name, title, url, summary))
            print(f"🔍 [{name}] {title[:60]}")

    return articles


def main():
    webhook_url = os.environ.get("DISCORD_WEBHOOK")
    if not webhook_url:
        raise SystemExit("Error: DISCORD_WEBHOOK no definido.")

    config = load_config()
    sent_urls = load_sent_urls()

    articles = collect_new_articles(config, sent_urls)

    if not articles:
        print("🟡 Sin artículos nuevos hoy.")
        return

    send_header(webhook_url, len(articles))

    new_urls = []
    for source, title, url, summary in articles:
        if send_article(webhook_url, title, url, source, summary):
            print(f"🟢 Enviado: {title[:60]}")
            new_urls.append(url)
        else:
            print(f"❌ Error enviando: {title[:60]}")

    save_urls(new_urls)
    print(f"✅ {len(new_urls)}/{MAX_DAILY} artículos enviados.")


if __name__ == "__main__":
    main()
