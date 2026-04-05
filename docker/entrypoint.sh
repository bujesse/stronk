#!/bin/sh
set -eu

envsubst '${VITE_SUPABASE_URL} ${VITE_SUPABASE_ANON_KEY}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js
