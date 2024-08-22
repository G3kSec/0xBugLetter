#!/bin/bash

if ! command -v pip &> /dev/null; then
  echo "Pip install..."
  python3 -m ensurepip --upgrade
fi

echo "Install Dependencies..."
pip install -r requirements.txt

echo "🏃 Run Script..."
python3 ./index.py $1 $2