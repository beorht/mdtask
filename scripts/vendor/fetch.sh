#!/bin/bash
# Скачать в public/vendor/ то, что раньше браузер брал с CDN: Python в браузере (Pyodide) с
# пакетом sqlite3 и редактор кода CodeMirror. Сайт отдаёт их сам, поэтому запуск кода работает
# и на ПК без интернета. Файлы лежат в git; скрипт нужен, только чтобы обновить их.
#   bash scripts/vendor/fetch.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

PYODIDE_VERSION=0.26.4
PYODIDE_URL="https://cdn.jsdelivr.net/pyodide/v$PYODIDE_VERSION/full"
PYODIDE_DIR="$ROOT/public/vendor/pyodide/$PYODIDE_VERSION"
PYODIDE_FILES="pyodide.js pyodide.asm.js pyodide.asm.wasm python_stdlib.zip pyodide-lock.json sqlite3-1.0.0.zip"

CODEMIRROR_VERSION=5.65.16
CODEMIRROR_URL="https://cdnjs.cloudflare.com/ajax/libs/codemirror/$CODEMIRROR_VERSION"
CODEMIRROR_DIR="$ROOT/public/vendor/codemirror/$CODEMIRROR_VERSION"
CODEMIRROR_FILES="codemirror.min.js codemirror.min.css theme/material-darker.min.css mode/python/python.min.js addon/edit/matchbrackets.min.js"

fetch() {
  mkdir -p "$(dirname "$2")"
  curl -fsSL --retry 3 -o "$2" "$1"
  echo "  $(du -h "$2" | cut -f1)	${2#$ROOT/}"
}

echo "Pyodide $PYODIDE_VERSION:"
for f in $PYODIDE_FILES; do fetch "$PYODIDE_URL/$f" "$PYODIDE_DIR/$f"; done
echo "CodeMirror $CODEMIRROR_VERSION:"
for f in $CODEMIRROR_FILES; do fetch "$CODEMIRROR_URL/$f" "$CODEMIRROR_DIR/$f"; done
