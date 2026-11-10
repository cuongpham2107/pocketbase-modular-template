#!/bin/sh
set -e

DATA_DIR="${PB_DATA_DIR:-/app/pb_data}"
HTTP_ADDR="${PB_HTTP_ADDR:-0.0.0.0:8090}"

# Nếu cấu hình tài khoản Admin mặc định qua biến môi trường, tự động đồng bộ RBAC và cấp quyền
if [ -n "$PB_ADMIN_EMAIL" ]; then
  echo "🔐 Ensuring admin account for ${PB_ADMIN_EMAIL}..."
  /app/pocketbase user:grant-admin "$PB_ADMIN_EMAIL" "${PB_ADMIN_PASSWORD:-}" --dir="$DATA_DIR" || true
fi

EXTRA_FLAGS=""
if [ "$PB_DEV" = "true" ] || [ "$PB_DEV" = "1" ]; then
  EXTRA_FLAGS="--dev"
fi

echo "🚀 Starting PocketBase Custom Server on ${HTTP_ADDR} (data: ${DATA_DIR})..."
exec /app/pocketbase serve --http="$HTTP_ADDR" --dir="$DATA_DIR" $EXTRA_FLAGS "$@"

