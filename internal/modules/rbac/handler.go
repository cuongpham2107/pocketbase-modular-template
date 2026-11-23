package rbac

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

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
