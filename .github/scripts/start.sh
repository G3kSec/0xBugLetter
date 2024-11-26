#!/bin/bash
# Colores para los mensajes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # Sin color

# Ejecutar el script Python
if [ -f "./index.py" ]; then
  ls -l
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
