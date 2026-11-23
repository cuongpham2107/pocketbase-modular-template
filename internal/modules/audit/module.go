// Package audit exposes PocketBase request logs as an audit trail.
package audit

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
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
