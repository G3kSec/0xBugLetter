"""
0xBugLetter — bot de notificaciones.

Lee los feeds declarados en data/sources.yaml, detecta lo que todavía no se
publicó y lo manda a Discord. Corre como GitHub Action una vez por día.

El archivo de historial se commitea de vuelta al repo, así que el estado
sobrevive entre ejecuciones sin necesidad de base de datos.
"""

import datetime
import os
import time
from pathlib import Path

import feedparser
import requests
import yaml
from bs4 import BeautifulSoup

# Las rutas se resuelven contra la ubicación del script, no contra el cwd:
# así el bot corre igual desde la raíz del repo o desde bot/.
BOT_DIR = Path(__file__).resolve().parent
REPO_ROOT = BOT_DIR.parent
HISTORY_FILE = BOT_DIR / "sent_urls.txt"
SOURCES_FILE = REPO_ROOT / "data" / "sources.yaml"

BOT_NAME = "0xBugLetter"
MAX_DAILY = 3
ENTRIES_PER_FEED = 10

COLOR_HEADER = 0xEB459E
COLOR_ARTICLE = 0x00B4D8


# Fuentes que el bot no puede consultar: `broken` es un feed que falla y
# `no-feed` es una fuente que directamente no tiene RSS.
UNFETCHABLE = {"broken", "no-feed"}


def load_sources():
    """Devuelve sólo las fuentes con un feed que el bot pueda leer."""
    with open(SOURCES_FILE, encoding="utf-8") as handle:
        config = yaml.safe_load(handle)

    sources = config.get("sources", [])
    usable = [s for s in sources if s.get("status") not in UNFETCHABLE]

    skipped = len(sources) - len(usable)
    if skipped:
        print(f"⏭  {skipped} fuente(s) sin feed utilizable, salteadas.")

    return usable


def load_sent_urls():
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, encoding="utf-8") as handle:
            return {line.strip() for line in handle if line.strip()}
    return set()


def save_urls(urls):
    with open(HISTORY_FILE, "a", encoding="utf-8") as handle:
        for url in urls:
            handle.write(url + "\n")


def strip_html(text):
    return BeautifulSoup(text or "", "html.parser").get_text()[:350]


def post(webhook_url, payload):
    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
    except requests.RequestException as error:
        print(f"❌ Error de red: {error}")
        return False

    # Discord limita a ~5 req/s por webhook; un segundo entre posts alcanza.
    time.sleep(1)

    if response.status_code == 429:
        retry_after = response.json().get("retry_after", 5)
        print(f"⏳ Rate limit, esperando {retry_after}s…")
        time.sleep(float(retry_after))
        return post(webhook_url, payload)

    return response.status_code in (200, 204)


def send_header(webhook_url, count):
    today = datetime.date.today().strftime("%d %b %Y")
    plural = "s" if count > 1 else ""
    payload = {
        "username": BOT_NAME,
        "embeds": [
            {
                "title": "⚡ 0xBugLetter :: Daily Drop",
                "description": (
                    f"> 🗓️ **{today}** — `{count}` lectura{plural} nueva{plural}.\n"
                    "> 🎯 Hunt smart. Break things (legally). Get paid. 💸\n"
                    "> ━━━━━━━━━━━━━━━━━━━━━━━━"
                ),
                "color": COLOR_HEADER,
            }
        ],
    }
    post(webhook_url, payload)


def send_article(webhook_url, title, url, source, description):
    payload = {
        "username": BOT_NAME,
        "embeds": [
            {
                "title": title[:256],
                "url": url,
                "description": description,
                "color": COLOR_ARTICLE,
                "footer": {"text": f"📡 {source}"},
            }
        ],
    }
    return post(webhook_url, payload)


def collect_new_articles(sources, sent_urls):
    articles = []

    for source in sources:
        if len(articles) >= MAX_DAILY:
            break

        name = source["name"]
        try:
            feed = feedparser.parse(source["url"])
        except Exception as error:  # noqa: BLE001 — un feed roto no corta la corrida
            print(f"❌ [{name}] {error}")
            continue

        if getattr(feed, "bozo", False) and not feed.entries:
            print(f"⚠️  [{name}] feed ilegible o vacío.")
            continue

        for entry in feed.entries[:ENTRIES_PER_FEED]:
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
        raise SystemExit("Error: DISCORD_WEBHOOK no está definido.")

    sources = load_sources()
    sent_urls = load_sent_urls()
    articles = collect_new_articles(sources, sent_urls)

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
            print(f"❌ Falló el envío: {title[:60]}")

    save_urls(new_urls)
    print(f"✅ {len(new_urls)}/{len(articles)} artículos enviados.")


if __name__ == "__main__":
    main()
