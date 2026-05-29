#!/bin/bash

if ! command -v pip &> /dev/null; then
  echo "Pip no encontrado. Instalando..."
  python3 -m ensurepip --upgrade || { echo "Error al instalar pip."; exit 1; }
fi

echo "Instalando dependencias Python..."
pip install -r requirements.txt || { echo "Error al instalar dependencias."; exit 1; }

if ! command -v go &> /dev/null; then
  echo "Go no encontrado. Instalando notify via prebuilt..."; exit 1
fi

if ! command -v notify &> /dev/null && [ ! -f "$HOME/go/bin/notify" ]; then
  echo "Instalando notify..."
  go install -v github.com/projectdiscovery/notify/cmd/notify@latest || { echo "Error al instalar notify."; exit 1; }
fi

if [ -z "$DISCORD_WEBHOOK" ]; then
  echo "Error: La variable DISCORD_WEBHOOK no está definida."
  exit 1
fi

sed -i "s|DISCORD_WEBHOOK_PLACEHOLDER|$DISCORD_WEBHOOK|g" config.yaml

echo "🏃 Ejecutando index.py..."
python3 ./index.py || { echo "Error al ejecutar index.py."; exit 1; }

echo "✅ Script completado con éxito."
