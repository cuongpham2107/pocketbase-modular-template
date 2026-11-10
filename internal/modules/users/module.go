// Package users is the user administration module.
package users

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermView   = "users:view"
	PermCreate = "users:create"
	PermUpdate = "users:update"
	PermDelete = "users:delete"
)

var Module = module.Module{
	Name:  "users",
	Label: "Quản lý Người Dùng",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem người dùng", Description: "Xem danh sách và chi tiết người dùng", Basic: true},
		{Code: PermCreate, Label: "Tạo người dùng", Description: "Thêm tài khoản người dùng mới"},
		{Code: PermUpdate, Label: "Sửa người dùng", Description: "Chỉnh sửa thông tin tài khoản người dùng"},
		{Code: PermDelete, Label: "Xoá người dùng", Description: "Xoá tài khoản người dùng khỏi hệ thống"},
	},
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}
	g := api.Group("/users").Bind(apis.RequireAuth())

	g.GET("/me/permissions", h.myPermissions)
	g.GET("", h.list).Bind(rbac.Require(PermView))
	g.POST("", h.create).Bind(rbac.Require(PermCreate))
	g.PUT("/{id}", h.update).Bind(rbac.Require(PermUpdate))
	g.DELETE("/{id}", h.delete).Bind(rbac.Require(PermDelete))
	g.POST("/{id}/roles", h.setRoles).Bind(rbac.Require(rbac.PermRolesManage))
}
