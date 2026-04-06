#!/bin/sh
set -eu

envsubst '${VITE_POCKETBASE_URL}' \
  < /usr/share/nginx/html/config.js.template \
  > /usr/share/nginx/html/config.js
