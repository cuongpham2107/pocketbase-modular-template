#!/usr/bin/env bash
# Script kiểm tra sự khác biệt giữa custom-admin-ui và mã nguồn UI gốc của phiên bản PocketBase hiện tại

set -e

PB_UI_DIR=$(go list -m -f '{{.Dir}}' ganigeorgiev.com/pocketbase/pocketbase 2>/dev/null)/ui

if [ ! -d "$PB_UI_DIR" ]; then
    echo "❌ Không tìm thấy thư mục UI gốc của PocketBase trong Go cache."
    exit 1
fi

echo "📦 Upstream PocketBase UI: $PB_UI_DIR"
echo "🎨 Custom Admin UI:        ./custom-admin-ui"
echo ""
echo "=== Các file mới hoặc thay đổi giữa 2 bên ==="
diff -qr \
    --exclude="node_modules" \
    --exclude="dist" \
    --exclude="i18n.js" \
    --exclude="package-lock.json" \
    "$PB_UI_DIR" ./custom-admin-ui || true

echo ""
echo "💡 Để xem chi tiết khác biệt cụ thể của 1 file:"
echo "   diff -u \"$PB_UI_DIR/path/to/file\" ./custom-admin-ui/path/to/file"
