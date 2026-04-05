#!/bin/sh
set -eu

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "schema bootstrap skipped: SUPABASE_DB_URL is not set"
  exit 0
fi

echo "waiting for database connection..."
until pg_isready -d "$SUPABASE_DB_URL" >/dev/null 2>&1; do
  sleep 1
done

echo "applying schema.sql..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f /schema/schema.sql

echo "schema bootstrap complete"
