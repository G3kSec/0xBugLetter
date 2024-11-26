#!/bin/bash

if ! command -v go &> /dev/null; then
  echo -e "${YELLOW}'Go' no encontrado. Instalando...${NC}"
  # Asegúrate de que tu sistema tenga acceso para instalar Go.
  # Aquí puedes agregar la instalación de Go para tu sistema operativo si es necesario.
  echo -e "${RED}Error: Go no está instalado. Por favor, instálalo manualmente.${NC}"
  exit 1
else
  echo -e "${GREEN}'Go' ya está instalado.${NC}"
  find / -name "notify" 2>/dev/null
fi



