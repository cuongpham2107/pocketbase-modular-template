// Package notifications serves per-user and broadcast notifications.
package notifications

import (
	"net/http"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"
	"github.com/gorilla/websocket"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
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
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}

	// Browsers can't set headers on WebSocket upgrades, so the stream is mounted outside RequireAuth.
	api.GET("/notifications/stream", stream)

	g := api.Group("/notifications").Bind(apis.RequireAuth())
	g.GET("", h.list).Bind(rbac.Require(PermView))
	g.GET("/unread-count", h.unreadCount).Bind(rbac.Require(PermView))
	g.POST("/read-all", h.readAll).Bind(rbac.Require(PermView))
	g.POST("/{id}/read", h.markRead).Bind(rbac.Require(PermView))
	g.DELETE("/{id}", h.delete).Bind(rbac.Require(PermView))
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// stream keeps a socket open and only sends "ready".
// ponytail: placeholder; push real events (and require a ?token) when the frontend consumes them,
// or use PocketBase's built-in realtime SSE on the notifications collection instead.
func stream(e *core.RequestEvent) error {
	ws, err := upgrader.Upgrade(e.Response, e.Request, nil)
	if err != nil {
		return err
	}
	defer ws.Close()
	if err := ws.WriteJSON(map[string]any{"type": "ready"}); err != nil {
		return nil
	}
	for {
		if _, _, err := ws.ReadMessage(); err != nil {
			return nil
		}
	}
}
