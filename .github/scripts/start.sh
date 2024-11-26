#!/bin/bash

# Colores para los mensajes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin color

# Verificar si pip está instalado
if ! command -v pip &> /dev/null; then
  echo -e "${YELLOW}Pip no encontrado. Instalando...${NC}"
  python3 -m ensurepip --upgrade || {
    echo -e "${RED}Error al instalar pip.${NC}"
    exit 1
  }
else
  echo -e "${GREEN}Pip ya está instalado.${NC}"
fi

# Instalar dependencias si existe requirements.txt
if [ -f "requirements.txt" ]; then
  echo -e "${YELLOW}Instalando dependencias...${NC}"
  pip install -r requirements.txt || {
    echo -e "${RED}Error al instalar dependencias.${NC}"
    exit 1
  }
else
  echo -e "${RED}Archivo requirements.txt no encontrado.${NC}"
  exit 1
fi

if ! command -v go &> /dev/null; then
  echo -e "${YELLOW}'Go' no encontrado. Instalando...${NC}"
  # Asegúrate de que tu sistema tenga acceso para instalar Go.
  # Aquí puedes agregar la instalación de Go para tu sistema operativo si es necesario.
  echo -e "${RED}Error: Go no está instalado. Por favor, instálalo manualmente.${NC}"
  exit 1
else
  echo -e "${GREEN}'Go' ya está instalado.${NC}"
fi

# Verificar si 'notify' está instalado
if ! command -v notify &> /dev/null; then
  echo -e "${YELLOW}'notify' no encontrado. Instalando...${NC}"
  # Instalar notify usando Go
  go install -v github.com/projectdiscovery/notify/cmd/notify@latest || {
    echo -e "${RED}Error al instalar 'notify'.${NC}"
    exit 1
  }
else
  echo -e "${GREEN}'notify' ya está instalado.${NC}"
fi

# Crear el archivo config.yaml
TELEGRAM_TOKEN=$1
CHAT_ID=$2
DISCORD_WEBHOOK=$3

if [ -z "$TELEGRAM_TOKEN" ] || [ -z "$CHAT_ID" ] || [ -z "$DISCORD_WEBHOOK" ]; then
  echo -e "${RED}Faltan variables necesarias para crear ./config.yaml.${NC}"
  exit 1
fi

echo -e "${YELLOW}Generando archivo config.yaml...${NC}"
echo -e " 
discord:
  - id: \"notify-discord\"
    discord_channel: \"notify\"
    discord_username: \"Bot-Alert (By Notify)\"
    discord_format: \"{{data}}\"
    discord_webhook_url: \"${DISCORD_WEBHOOK}\"

telegram:
  - id: \"notify-telegram\"
    telegram_api_key: \"${TELEGRAM_TOKEN}\"
    telegram_chat_id: \"${CHAT_ID}\"
    telegram_format: \"{{data}}\"
    telegram_parsemode: \"Markdown\"
" > ./config.yaml

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Archivo ./config.yaml generado exitosamente.${NC}"
else
  echo -e "${RED}Error al generar ./config.yaml.${NC}"
  exit 1
fi

# Ejecutar el script Python
if [ -f "./index.py" ]; then
  echo -e "${YELLOW}🏃 Ejecutando el script index.py...${NC}"
  python3 ./index.py || {
    echo -e "${RED}Error al ejecutar ./index.py.${NC}"
    exit 1
  }
else
  echo -e "${RED}Archivo ./index.py no encontrado.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Script completado con éxito.${NC}"
