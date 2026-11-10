package rbac

import (
	"slices"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/hook"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

// UserDTO is the user payload the frontend expects (shared by the auth and users modules).
type UserDTO struct {
	ID            string   `json:"id"`
	Email         string   `json:"email"`
	FullName      string   `json:"full_name"`
	Name          string   `json:"name"`
	Role          string   `json:"role"`
	Roles         []string `json:"roles"`
	Permissions   []string `json:"permissions"`
	ThemeSettings string   `json:"theme_settings,omitempty"`
	CreatedAt     string   `json:"created_at"`
}

var userExpand = []string{"roles", "roles.permissions"}

// FormatUsers batch-loads roles and permissions (one expand for the whole slice) and maps to DTOs.
func FormatUsers(app core.App, users []*core.Record) []*UserDTO {
	// Expand errors only mean "no roles"; permissions then stay empty, which fails closed.
	app.ExpandRecords(users, userExpand, nil)
	out := make([]*UserDTO, 0, len(users))
	for _, u := range users {
		out = append(out, toUserDTO(u))
	}
	return out
}

// FormatUser is FormatUsers for a single record.
func FormatUser(app core.App, user *core.Record) *UserDTO {
	return FormatUsers(app, []*core.Record{user})[0]
}

func toUserDTO(u *core.Record) *UserDTO {
	roleNames, perms := rolesAndPerms(u)
	primary := RoleUser
	if len(roleNames) > 0 {
		primary = roleNames[0]
	}
	name := u.GetString("name")
	if name == "" {
		name, _, _ = strings.Cut(u.GetString("email"), "@")
	}
	return &UserDTO{
		ID:            u.Id,
		Email:         u.GetString("email"),
		FullName:      name,
		Name:          name,
		Role:          primary,
		Roles:         roleNames,
		Permissions:   perms,
		ThemeSettings: u.GetString("theme_settings"),
		CreatedAt:     u.GetString("created"),
	}
}

// rolesAndPerms reads an already-expanded user record.
func rolesAndPerms(u *core.Record) (roles []string, perms []string) {
	roles, perms = []string{}, []string{}
	for _, r := range u.ExpandedAll("roles") {
		if n := r.GetString("name"); n != "" {
			roles = append(roles, n)
		}
		for _, p := range r.ExpandedAll("permissions") {
			if c := p.GetString("code"); c != "" && !slices.Contains(perms, c) {
				perms = append(perms, c)
			}
		}
	}
	slices.Sort(perms)
	return roles, perms
}

// UserPermissions returns the permission codes granted to a user through their roles.
func UserPermissions(app core.App, user *core.Record) []string {
	app.ExpandRecord(user, userExpand, nil)
	_, perms := rolesAndPerms(user)
	return perms
}

// Can reports whether the request's auth is a superuser or holds the permission.
func Can(e *core.RequestEvent, code string) bool {
	if e.Auth == nil {
		return false
	}
	return e.HasSuperuserAuth() || slices.Contains(UserPermissions(e.App, e.Auth), code)
}

// Forbidden writes the standard 403 envelope.
func Forbidden(e *core.RequestEvent) error {
	return httpx.Fail(e, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này")
}

// Require is a route middleware that allows superusers and users holding the given permission.
func Require(code string) *hook.Handler[*core.RequestEvent] {
	return &hook.Handler[*core.RequestEvent]{
		Func: func(e *core.RequestEvent) error {
			if e.Auth == nil {
				return httpx.Fail(e, 401, "UNAUTHORIZED", "Chưa đăng nhập hoặc phiên đã hết hạn")
			}
			if !Can(e, code) {
				return Forbidden(e)
			}
			return e.Next()
		},
	}
}
