package users

import (
	"errors"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

type handler struct {
	svc service
}

func (h handler) list(e *core.RequestEvent) error {
	p := httpx.ParsePage(e, 10)
	q := e.Request.URL.Query()
	recs, total, err := h.svc.List(ListFilter{
		Search: strings.TrimSpace(q.Get("search")),
		Role:   strings.TrimSpace(q.Get("role")),
		Limit:  p.Limit,
		Offset: p.Offset,
	})
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải danh sách người dùng")
	}
	return httpx.Paged(e, rbac.FormatUsers(h.svc.app, recs), p, total)
}

func (h handler) create(e *core.RequestEvent) error {
	var in UserInput
	if err := e.BindBody(&in); err != nil {
		return httpx.BadRequest(e)
	}
	if in.Role != "" && !rbac.Can(e, rbac.PermRolesManage) {
		return rbac.Forbidden(e)
	}
	rec, err := h.svc.Create(in)
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể tạo người dùng: "+err.Error())
	}
	return httpx.OK(e, 201, rbac.FormatUser(h.svc.app, rec))
}

func (h handler) update(e *core.RequestEvent) error {
	var in UserInput
	if err := e.BindBody(&in); err != nil {
		return httpx.BadRequest(e)
	}
	// Changing roles is privilege management, not a profile edit.
	if in.Role != "" && !rbac.Can(e, rbac.PermRolesManage) {
		return rbac.Forbidden(e)
	}
	rec, err := h.svc.Update(e.Request.PathValue("id"), in)
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", err.Error())
	}
	return httpx.OK(e, 200, rbac.FormatUser(h.svc.app, rec))
}

func (h handler) delete(e *core.RequestEvent) error {
	err := h.svc.Delete(e.Request.PathValue("id"), e.Auth.Id)
	switch {
	case errors.Is(err, ErrNotFound):
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrDeleteSelf):
		return httpx.Fail(e, 400, "FAILED", err.Error())
	case err != nil:
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể xoá người dùng")
	}
	return httpx.Message(e, "Xoá người dùng thành công")
}

func (h handler) setRoles(e *core.RequestEvent) error {
	var req struct {
		RoleNames []string `json:"role_names"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	if err := rbac.AssignRolesToUser(h.svc.app, e.Request.PathValue("id"), req.RoleNames); err != nil {
		return httpx.Fail(e, 400, "FAILED", err.Error())
	}
	return httpx.Message(e, "Gán vai trò thành công")
}

func (h handler) myPermissions(e *core.RequestEvent) error {
	perms := rbac.UserPermissions(h.svc.app, e.Auth)
	return e.JSON(200, map[string]any{
		"success":     true,
		"data":        map[string]any{"permissions": perms},
		"permissions": perms,
	})
}
