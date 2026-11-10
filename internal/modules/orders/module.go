// Package orders is the reference business module. Copy this folder to start a new feature:
//
//	module.go   – permissions + routes (+ Init for hooks/cron)
//	handler.go  – HTTP only: bind → service → httpx
//	service.go  – business rules, transactions; no HTTP types
//	*_test.go   – service tests against tests.NewTestApp
package orders

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermView    = "orders:view"
	PermCreate  = "orders:create"
	PermConfirm = "orders:confirm"
)

var Module = module.Module{
	Name:  "orders",
	Label: "Đơn Hàng",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem đơn hàng", Description: "Xem danh sách và chi tiết đơn hàng"},
		{Code: PermCreate, Label: "Tạo đơn hàng", Description: "Tạo đơn hàng mới"},
		{Code: PermConfirm, Label: "Xác nhận đơn hàng", Description: "Duyệt đơn hàng đang chờ"},
	},
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}
	g := api.Group("/orders").Bind(apis.RequireAuth())
	g.GET("", h.list).Bind(rbac.Require(PermView))
	g.POST("", h.create).Bind(rbac.Require(PermCreate))
	g.POST("/{id}/confirm", h.confirm).Bind(rbac.Require(PermConfirm))
}
