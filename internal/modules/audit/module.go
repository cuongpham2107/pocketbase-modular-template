// Package audit exposes PocketBase request logs as an audit trail.
package audit

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const PermView = "audit:view"

var Module = module.Module{
	Name:  "audit",
	Label: "Nhật Ký Hệ Thống",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem nhật ký", Description: "Tra cứu lịch sử thao tác hệ thống"},
	},
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}
	g := api.Group("/audit-logs").Bind(apis.RequireAuth(), rbac.Require(PermView))
	g.GET("", h.list)
	g.GET("/filters", h.filters)
}

type handler struct {
	svc service
}

func (h handler) filters(e *core.RequestEvent) error {
	return httpx.OK(e, 200, map[string]any{
		"actions":   []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
		"resources": []string{"auth", "users", "roles", "permissions", "notifications", "audit-logs", "orders", "files", "system"},
	})
}

func (h handler) list(e *core.RequestEvent) error {
	p := httpx.ParsePage(e, 20)
	q := e.Request.URL.Query()
	items, total, err := h.svc.List(Filter{
		Query:    q.Get("q"),
		Status:   q.Get("status"),
		Action:   q.Get("action"),
		Resource: q.Get("resource"),
		Limit:    p.Limit,
		Offset:   p.Offset,
	})
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải nhật ký")
	}
	return httpx.Paged(e, items, p, total)
}
