// Package rbac owns roles, permissions, the permission middleware and the shared user DTO.
// It is the only module other modules may import.
package rbac

import (
	"slices"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermRolesView   = "roles:view"
	PermRolesCreate = "roles:create"
	PermRolesUpdate = "roles:update"
	PermRolesDelete = "roles:delete"
	PermRolesManage = "roles:manage"
)

var permissions = []module.Permission{
	{Code: PermRolesView, Label: "Xem vai trò", Description: "Xem danh sách và chi tiết các vai trò"},
	{Code: PermRolesCreate, Label: "Tạo vai trò", Description: "Tạo vai trò mới trong hệ thống"},
	{Code: PermRolesUpdate, Label: "Sửa vai trò", Description: "Chỉnh sửa vai trò và phân quyền"},
	{Code: PermRolesDelete, Label: "Xoá vai trò", Description: "Xoá vai trò người dùng"},
	{Code: PermRolesManage, Label: "Quản trị quyền", Description: "Toàn quyền quản trị và điều phối phân quyền"},
}

// NewModule builds the rbac module. features are the other modules whose permissions form the catalog.
// It also returns the full catalog (features + rbac) for rbac.Sync.
func NewModule(features []module.Module) (module.Module, []Group) {
	m := module.Module{Name: "roles", Label: "Vai Trò & Phân Quyền", Permissions: permissions}
	catalog := BuildCatalog(append(slices.Clone(features), m))
	m.Routes = func(api *router.RouterGroup[*core.RequestEvent], app core.App) {
		h := handler{app: app, catalog: catalog}

		roles := api.Group("/roles").Bind(apis.RequireAuth())
		roles.GET("", h.listRoles).Bind(Require(PermRolesView))
		roles.POST("", h.createRole).Bind(Require(PermRolesCreate))
		roles.POST("/{id}/permissions", h.setRolePermissions).Bind(Require(PermRolesManage))
		roles.GET("/{id}/users", h.roleUsers).Bind(Require(PermRolesView))
		roles.POST("/{id}/users", h.addRoleUsers).Bind(Require(PermRolesManage))

		perms := api.Group("/permissions").Bind(apis.RequireAuth())
		perms.GET("", h.listPermissions).Bind(Require(PermRolesView))
		perms.GET("/catalog", h.getCatalog).Bind(Require(PermRolesView))
		perms.GET("/coverage", h.coverage).Bind(Require(PermRolesView))
	}
	return m, catalog
}
