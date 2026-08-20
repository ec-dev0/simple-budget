#!/bin/sh
# Pre-arranque para imagen simple-budget:
#  - garantiza que la carpeta del volumen SQLite existe
#  - corrige el owner (a veces el bind-mount llega propiedad de root)
#  - propaga el código de salida del proceso hijo sin envolver tini
set -eu

DB_FILE="${DB_PATH:-/app/data/budget.db}"
DB_DIR="$(dirname "$DB_FILE")"

mkdir -p "$DB_DIR"
chown -R bun:bun "$DB_DIR" 2>/dev/null || true

exec "$@"
