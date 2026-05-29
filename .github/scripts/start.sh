#!/bin/bash
set -e

echo "Instalando dependencias..."
pip install -r requirements.txt

if [ -z "$DISCORD_WEBHOOK" ]; then
  echo "Error: DISCORD_WEBHOOK no definido."
  exit 1
fi

echo "🏃 Ejecutando index.py..."
python3 ./index.py

echo "✅ Script completado con éxito."
