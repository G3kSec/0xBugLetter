import os
import subprocess
from bs4 import BeautifulSoup
import requests

TAGS = ['bug-bounty', 'bug-bounty-writeup', 'bug-bounty-hunter']
HISTORY_FILE = "sent_messages.txt"


def load_sent_messages():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return f.read()
    return ""


def save_message(message):
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(message + "\n\n")


def send_to_discord(message):
    with open("temp_notify.txt", "w") as f:
        f.write(message)
    result = subprocess.run(
        ["notify", "-silent", "-pc", "config.yaml", "-p", "discord", "-bulk"],
        stdin=open("temp_notify.txt"),
        capture_output=True,
        text=True,
    )
    os.remove("temp_notify.txt")
    return result.returncode == 0


def scrape_tag(tag, sent_messages):
    url = f"https://medium.com/tag/{tag}/archive"
    response = requests.get(url, timeout=15)
    if response.status_code != 200:
        print(f"❌ Error al acceder a Medium para '{tag}'. Status: {response.status_code}")
        return

    soup = BeautifulSoup(response.text, "html.parser")
    stories = soup.find_all("article")
    if not stories:
        print(f"🟡 No se encontraron artículos para '{tag}'.")
        return

    for story in stories:
        title_el = story.find("h2")
        link_el = story.find("div", style="position:relative;display:flex")
        author_el = story.find("p")

        if not title_el or not link_el:
            continue

        title = title_el.text
        story_url = link_el.get("data-href", "")
        author = author_el.text if author_el else "Unknown Author"
        message = f"📌 {title}\n✍️ Author: {author}\n🔗 Link: {story_url}"

        if message in sent_messages:
            print(f"🟡 Duplicado, omitido: {title[:50]}")
            continue

        if send_to_discord(message):
            print(f"🟢 Enviado: {title[:50]}")
            save_message(message)
            sent_messages += message + "\n\n"
        else:
            print(f"❌ Error al enviar: {title[:50]}")


def main():
    sent_messages = load_sent_messages()
    for tag in TAGS:
        scrape_tag(tag, sent_messages)


if __name__ == "__main__":
    main()
