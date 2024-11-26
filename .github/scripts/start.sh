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
