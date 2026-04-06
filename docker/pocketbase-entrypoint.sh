#!/bin/sh
set -eu

: "${PB_SUPERUSER_EMAIL:?PB_SUPERUSER_EMAIL is required}"
: "${PB_SUPERUSER_PASSWORD:?PB_SUPERUSER_PASSWORD is required}"

mkdir -p /pb/pb_data

pocketbase superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" --dir="/pb/pb_data"
exec pocketbase serve --http="0.0.0.0:8090" --dir="/pb/pb_data"
