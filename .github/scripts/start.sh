#!/bin/bash

if ! command -v pip &> /dev/null; then
  echo -e "Pip no encontrado. Instalando..."
  python3 -m ensurepip --upgrade || {
    echo -e "Error al instalar pip."
    exit 1
  }
else
  echo -e "Pip ya está instalado."
fi

if [ -f "requirements.txt" ]; then
  echo -e "Instalando dependencias..."
  pip install -r requirements.txt || {
    echo -e "Error al instalar dependencias."
    exit 1
  }
else
  echo -e "Archivo requirements.txt no encontrado."
  exit 1
fi

if [ -f "index.py" ]; then
  echo -e "🏃 Ejecutando el script index.py..."
  python3 ./index.py || {
    echo -e "Error al ejecutar index.py."
    exit 1
  }
else
  echo -e "Archivo index.py no encontrado."
  exit 1
fi

echo -e "✅ Script completado con éxito."
