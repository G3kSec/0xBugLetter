#!/bin/bash
set -euo pipefail

if [ -z "${DISCORD_WEBHOOK:-}" ]; then
  echo "Error: DISCORD_WEBHOOK no está definido."
  exit 1
fi

echo "📦 Instalando dependencias..."
pip install --quiet -r bot/requirements.txt

echo "🏃 Ejecutando el bot..."
python3 bot/index.py

echo "✅ Listo."
