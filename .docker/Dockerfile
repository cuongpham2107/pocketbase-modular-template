# =============================================================================
# Stage 1: Build React Admin Portal (frontend-admin -> pb_public/admin)
# =============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend-admin

COPY frontend-admin/package.json frontend-admin/package-lock.json* ./
RUN npm ci

COPY frontend-admin/ ./
# Vite config builds directly to ../pb_public/admin
RUN npm run build

# =============================================================================
# Stage 2: Build Go PocketBase Backend (Pure Go SQLite, CGO_ENABLED=0)
# =============================================================================
FROM golang:1.27-alpine AS backend-builder

WORKDIR /build

# Tải trước Go dependencies để tối ưu Docker layer cache
COPY go.mod go.sum ./
RUN go mod download

# Copy toàn bộ mã nguồn Go
COPY main.go ./
COPY internal/ ./internal/
COPY migrations/ ./migrations/

# Biên dịch binary tĩnh tối ưu dung lượng
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /build/pocketbase .

# =============================================================================
# Stage 3: Minimal Production Runtime
# =============================================================================
FROM alpine:3.21 AS runtime

RUN apk add --no-cache ca-certificates tzdata wget

ENV TZ=Asia/Ho_Chi_Minh \
    PB_DATA_DIR=/app/pb_data \
    PB_HTTP_ADDR=0.0.0.0:8090 \
    PB_DEV=false

WORKDIR /app

# Copy binary và static frontend đã build
COPY --from=backend-builder /build/pocketbase /app/pocketbase
COPY --from=frontend-builder /build/pb_public /app/pb_public
COPY .docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/pocketbase /app/entrypoint.sh && \
    mkdir -p /app/pb_data

VOLUME ["/app/pb_data"]
EXPOSE 8090

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8090/ready || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]

