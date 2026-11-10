// Package notifications serves per-user and broadcast notifications with realtime WebSocket push,
// PocketBase record hooks, and scheduled cleanup jobs.
package notifications

import (
	"net/http"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"
	"github.com/gorilla/websocket"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermView = "notifications:view"
	PermSend = "notifications:send"
)

var Module = module.Module{
	Name:  "notifications",
	Label: "Thông Báo",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem thông báo", Description: "Xem danh sách thông báo gửi đến", Basic: true},
		{Code: PermSend, Label: "Gửi thông báo", Description: "Phát hành thông báo mới"},
	},
	Init:   initHooksAndJobs,
	Routes: routes,
}

func initHooksAndJobs(app core.App) {
	// Event Hook: Push every newly created notification to connected WebSocket clients in real time.
	app.OnRecordAfterCreateSuccess("notifications").BindFunc(func(e *core.RecordEvent) error {
		defaultHub.publish(e.Record.GetString("user_id"), toItem(e.Record))
		return e.Next()
	})

	// Scheduled Cron Job: Clean up read notifications older than 30 days at 03:00 every day.
	app.Cron().MustAdd("notifications_cleanup_read", "0 3 * * *", func() {
		svc := service{app: app}
		cutoff := time.Now().Add(-30 * 24 * time.Hour)
		if deleted, err := svc.CleanOldRead(cutoff); err != nil {
			app.Logger().Warn("notifications cleanup failed", "error", err)
		} else if deleted > 0 {
			app.Logger().Info("cleaned old read notifications", "deleted", deleted)
		}
	})
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}

	// Browsers pass JWT via ?access_token= on WebSocket upgrades.
	api.GET("/notifications/stream", stream(app))

	g := api.Group("/notifications").Bind(apis.RequireAuth())
	g.GET("", h.list).Bind(rbac.Require(PermView))
	g.POST("", h.create).Bind(rbac.Require(PermSend))
	g.GET("/unread-count", h.unreadCount).Bind(rbac.Require(PermView))
	g.POST("/read-all", h.readAll).Bind(rbac.Require(PermView))
	g.POST("/{id}/read", h.markRead).Bind(rbac.Require(PermView))
	g.DELETE("/{id}", h.delete).Bind(rbac.Require(PermView))
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func stream(app core.App) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		token := strings.TrimSpace(e.Request.URL.Query().Get("access_token"))
		if token == "" {
			return httpx.Fail(e, 401, "UNAUTHORIZED", "Thiếu access_token")
		}
		user, err := app.FindAuthRecordByToken(token, core.TokenTypeAuth)
		if err != nil || user == nil {
			return httpx.Fail(e, 401, "UNAUTHORIZED", "Token không hợp lệ hoặc đã hết hạn")
		}

		ws, err := upgrader.Upgrade(e.Response, e.Request, nil)
		if err != nil {
			return err
		}
		defer ws.Close()

		conn := defaultHub.add(user.Id, ws)
		defer defaultHub.remove(user.Id, conn)

		if err := conn.writeJSON(map[string]any{"type": "ready"}); err != nil {
			return nil
		}
		for {
			if _, _, err := ws.ReadMessage(); err != nil {
				return nil
			}
		}
	}
}
