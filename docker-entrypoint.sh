#!/bin/sh
set -eu

DB_FILE="${DB_PATH:-/app/data/budget.db}"
DB_DIR="$(dirname "$DB_FILE")"
APP_USER="${APP_USER:-app}"

mkdir -p "$DB_DIR"

if [ "$(id -u)" = "0" ]; then
  chown -R "$APP_USER:$APP_USER" "$DB_DIR"
  exec runuser -u "$APP_USER" -- "$@"
fi

exec "$@"
