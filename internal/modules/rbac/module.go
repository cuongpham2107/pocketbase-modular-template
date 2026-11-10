// Package rbac owns roles, permissions, the permission middleware and the shared user DTO.
// It is the only module other modules may import.
package rbac

import (
	"slices"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
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

type handler struct {
	app     core.App
	catalog []Group
}

func (h handler) listRoles(e *core.RequestEvent) error {
	recs, err := h.app.FindRecordsByFilter("roles", "", "name", 0, 0)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải danh sách vai trò")
	}
	return httpx.OK(e, 200, formatRoles(h.app, recs))
}

func (h handler) createRole(e *core.RequestEvent) error {
	var req struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	role, err := CreateRole(h.app, req.Name, req.Description, req.Permissions)
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể tạo vai trò: "+err.Error())
	}
	return httpx.OK(e, 201, formatRoles(h.app, []*core.Record{role})[0])
}

func (h handler) setRolePermissions(e *core.RequestEvent) error {
	var req struct {
		PermissionCodes []string `json:"permission_codes"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	if err := AssignPermissionsToRole(h.app, e.Request.PathValue("id"), req.PermissionCodes); err != nil {
		return httpx.Fail(e, 400, "FAILED", err.Error())
	}
	return httpx.Message(e, "Gán quyền thành công")
}

func (h handler) roleUsers(e *core.RequestEvent) error {
	users, err := h.app.FindRecordsByFilter("users", "roles ~ {:id}", "", 0, 0, map[string]any{"id": e.Request.PathValue("id")})
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải người dùng")
	}
	ids := make([]string, 0, len(users))
	for _, u := range users {
		ids = append(ids, u.Id)
	}
	return httpx.OK(e, 200, ids)
}

func (h handler) addRoleUsers(e *core.RequestEvent) error {
	var req struct {
		UserIDs []string `json:"user_ids"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	if err := AddUsersToRole(h.app, e.Request.PathValue("id"), req.UserIDs); err != nil {
		return httpx.Fail(e, 400, "FAILED", err.Error())
	}
	return httpx.Message(e, "Gán người dùng vào vai trò thành công")
}

func (h handler) listPermissions(e *core.RequestEvent) error {
	recs, err := h.app.FindRecordsByFilter("permissions", "", "module,code", 0, 0)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải danh sách quyền")
	}
	active := map[string]bool{}
	for _, it := range flatten(h.catalog) {
		active[it.Code] = true
	}
	out := make([]*PermissionDTO, 0, len(recs))
	for _, p := range recs {
		out = append(out, formatPermission(p, active[p.GetString("code")]))
	}
	return httpx.OK(e, 200, out)
}

func (h handler) getCatalog(e *core.RequestEvent) error {
	return httpx.OK(e, 200, h.catalog)
}

func (h handler) coverage(e *core.RequestEvent) error {
	report, err := Coverage(h.app, h.catalog)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tính độ phủ quyền")
	}
	return httpx.OK(e, 200, report)
}
