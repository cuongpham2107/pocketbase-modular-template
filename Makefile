.DEFAULT_GOAL := help
.PHONY: help dev run serve build build-frontend build-backend install clean sync

# Colors for terminal output
CYAN   := \033[36m
GREEN  := \033[32m
YELLOW := \033[33m
RED    := \033[31m
RESET  := \033[0m

# Detect Air CLI for hot-reload
AIR := $(shell command -v air 2> /dev/null || echo "$$HOME/go/bin/air")

## help: Hiển thị danh sách các lệnh có sẵn
help:
	@echo ""
	@echo "$(CYAN)=================================================================$(RESET)"
	@echo "$(CYAN)               PocketBase Custom Project Makefile                $(RESET)"
	@echo "$(CYAN)=================================================================$(RESET)"
	@echo ""
	@echo "Sử dụng: $(YELLOW)make [target]$(RESET)"
	@echo ""
	@echo "$(GREEN)Các lệnh chính:$(RESET)"
	@echo "  $(YELLOW)make dev$(RESET)            Khởi động cả Backend (hot-reload) & Frontend (Vite HMR) song song"
	@echo "  $(YELLOW)make run$(RESET) (hoặc serve) Build frontend rồi chạy PocketBase nguyên khối tại cổng 8090"
	@echo "  $(YELLOW)make build$(RESET)          Build toàn bộ project (React Frontend + Go Backend binary)"
	@echo "  $(YELLOW)make install$(RESET)        Cài đặt đầy đủ dependencies (Go modules + npm packages)"
	@echo "  $(YELLOW)make clean$(RESET)          Dọn dẹp thư mục tạm tmp/"
	@echo "  $(YELLOW)make sync$(RESET)           Đồng bộ CodeGraph knowledge graph"
	@echo ""
	@echo "$(CYAN)Địa chỉ truy cập khi chạy:$(RESET)"
	@echo "  - Backend Dev Studio : $(GREEN)http://127.0.0.1:8090/_/$(RESET)"
	@echo "  - Business Portal    : $(GREEN)http://127.0.0.1:8090/admin/$(RESET) (hoặc :5173/admin/ khi make dev)"
	@echo "  - REST API           : $(GREEN)http://127.0.0.1:8090/api/$(RESET)"
	@echo ""

## install: Cài đặt dependencies cho cả Go và React
install:
	@echo "$(YELLOW)📥 Đang cài đặt Go modules...$(RESET)"
	@go mod download
	@go mod tidy
	@echo "$(YELLOW)📥 Đang cài đặt Frontend npm packages...$(RESET)"
	@cd frontend-admin && npm install
	@echo "$(GREEN)✅ Cài đặt hoàn tất!$(RESET)"

## build-frontend: Build React frontend vào pb_public/admin
build-frontend:
	@echo "$(YELLOW)📦 Đang build React Frontend...$(RESET)"
	@cd frontend-admin && npm run build

## build-backend: Biên dịch Go binary vào tmp/main
build-backend:
	@echo "$(YELLOW)🔨 Đang biên dịch Go Backend...$(RESET)"
	@mkdir -p tmp
	@go build -o tmp/main .

## build: Build cả Frontend và Backend
build: build-frontend build-backend
	@echo "$(GREEN)✅ Build toàn bộ project thành công!$(RESET)"

## dev: Chạy song song Go backend (Air hot reload) và Frontend (Vite HMR)
dev:
	@echo "$(GREEN)🚀 Đang khởi động môi trường phát triển (Full-stack Dev)...$(RESET)"
	@echo "$(CYAN)→ Backend:  http://127.0.0.1:8090 (Studio: /_/)$(RESET)"
	@echo "$(CYAN)→ Frontend: http://localhost:5173/admin/ (Proxy API sang 8090)$(RESET)"
	@echo "$(YELLOW)Bấm Ctrl+C để dừng cả 2 tiến trình.$(RESET)"
	@trap 'kill 0' SIGINT SIGTERM EXIT; \
	(if [ -x "$(AIR)" ]; then $(AIR); else go run . serve --dev --dir=./pb_data; fi) & \
	(cd frontend-admin && npm run dev) & \
	wait

## run: Build frontend trước, sau đó chạy server PocketBase tích hợp
run: build-frontend
	@echo "$(GREEN)🚀 Đang khởi động PocketBase server tích hợp...$(RESET)"
	@go run . serve --dev --dir=./pb_data

## serve: Alias của run
serve: run

## clean: Dọn dẹp thư mục tạm
clean:
	@rm -rf tmp/*
	@echo "$(GREEN)✅ Đã dọn dẹp thư mục tmp/$(RESET)"

## sync: Đồng bộ CodeGraph
sync:
	@codegraph sync
