// Package settings manages the singleton system configuration (branding and default theme).
package settings

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermView   = "settings:view"
	PermUpdate = "settings:update"
)

var Module = module.Module{
	Name:  "settings",
	Label: "Cài Đặt Hệ Thống",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem cài đặt hệ thống", Description: "Xem cấu hình chung, thương hiệu và giao diện mặc định"},
		{Code: PermUpdate, Label: "Cập nhật cài đặt hệ thống", Description: "Chỉnh sửa tiêu đề, mô tả, logo, favicon và giao diện mặc định"},
	},
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}

	// Public endpoint so the login screen and browser tab can read branding & default theme before auth.
	api.GET("/settings/public", h.public)

	g := api.Group("/settings").Bind(apis.RequireAuth())
	g.GET("", h.get).Bind(rbac.Require(PermView))
	g.PUT("", h.update).Bind(rbac.Require(PermUpdate))
}
