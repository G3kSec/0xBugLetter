import os
import requests
from bs4 import BeautifulSoup

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT")
CHAT_ID = os.getenv("CHAT_ID")
url_telegram = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"

tags = ['bug-bounty', 'bug-bounty-writeup', 'bug-bounty-hunter']

if os.path.exists("telegram_messages.txt"):
  with open("telegram_messages.txt", "r", encoding="utf-8") as file:
    sent_messages = file.read()
else:
  sent_messages = ""
for tag in tags:
  url_medium = f"https://medium.com/tag/{tag}/archive"
  response = requests.get(url_medium)
  if response.status_code == 200:
    soup = BeautifulSoup(response.text, 'html.parser')
    stories = soup.find_all('article')
    if stories:
      story = stories[0]
      title = story.find('h2').text if story.find('h2') else 'No Title'
      story_url = story.find('div', style="position:relative;display:flex")["data-href"]
      author = story.find('p').text if story.find('p') else 'Unknown Author'
      message = f"📌 {title}\n✍️ Author: {author}\n🔗 Link: {story_url}"
      if message not in sent_messages:
        params = {
          "chat_id": CHAT_ID,
          "text": message
        }
        response_telegram = requests.post(url_telegram, data=params)
        if response_telegram.status_code == 200:
          print("Mensaje enviado exitosamente.")
          with open("telegram_messages.txt", "a", encoding="utf-8") as file:
            file.write(message + "\n\n")
        else:
          print(f"Error al enviar el mensaje. Código de estado: {response_telegram.status_code}")
      else:
        print("Mensaje duplicado, no enviado.")
    else:
      print("No se encontraron artículos.")
  else:
    print(f"Error al acceder a Medium. Código de estado: {response.status_code}")
