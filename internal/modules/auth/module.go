// Package auth handles sign-in, sign-up, token refresh and the current user's own settings.
package auth

import (
	"net/http"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

// sessionCookie is a non-secret UI hint ("a session probably exists"); the real credential is the Bearer token.
const sessionCookie = "has_session"

var Module = module.Module{
	Name:   "auth",
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{app: app}
	g := api.Group("/auth")

	g.POST("/login", h.login)
	g.POST("/register", h.register)
	g.POST("/refresh", h.refresh).Bind(apis.RequireAuth())
	g.POST("/logout", h.logout)
	g.POST("/logout-all", h.logoutAll).Bind(apis.RequireAuth())
	g.GET("/me", h.me).Bind(apis.RequireAuth())
	g.PUT("/settings/theme", h.saveTheme).Bind(apis.RequireAuth())
	g.PUT("/password", h.changePassword).Bind(apis.RequireAuth())
}

type handler struct {
	app core.App
}

func (h handler) login(e *core.RequestEvent) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	user, err := h.app.FindAuthRecordByEmail("users", strings.TrimSpace(req.Email))
	if err != nil || !user.ValidatePassword(req.Password) {
		return httpx.Fail(e, 401, "UNAUTHORIZED", "Email hoặc mật khẩu không chính xác")
	}
	return h.issueSession(e, user, "Đăng nhập thành công")
}

func (h handler) register(e *core.RequestEvent) error {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	col, err := h.app.FindCollectionByNameOrId("users")
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Collection users không tồn tại")
	}

	user := core.NewRecord(col)
	user.Set("email", strings.TrimSpace(req.Email))
	user.Set("name", strings.TrimSpace(req.FullName))
	user.SetPassword(req.Password)
	if role, err := h.app.FindFirstRecordByData("roles", "name", rbac.RoleUser); err == nil {
		user.Set("roles", []string{role.Id})
	}
	if err := h.app.Save(user); err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể tạo tài khoản: "+err.Error())
	}
	return h.issueSession(e, user, "Đăng ký thành công")
}

func (h handler) refresh(e *core.RequestEvent) error {
	return h.issueSession(e, e.Auth, "")
}

func (h handler) logout(e *core.RequestEvent) error {
	clearSessionCookie(e)
	return httpx.Message(e, "Đã đăng xuất")
}

// logoutAll rotates the token key, which invalidates every token issued for this user.
func (h handler) logoutAll(e *core.RequestEvent) error {
	e.Auth.RefreshTokenKey()
	if err := h.app.Save(e.Auth); err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể đăng xuất các thiết bị")
	}
	clearSessionCookie(e)
	return httpx.Message(e, "Đã đăng xuất tất cả thiết bị")
}

func (h handler) me(e *core.RequestEvent) error {
	return httpx.OK(e, 200, rbac.FormatUser(h.app, e.Auth))
}

func (h handler) saveTheme(e *core.RequestEvent) error {
	var req struct {
		ThemeSettings string `json:"theme_settings"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	e.Auth.Set("theme_settings", req.ThemeSettings)
	if err := h.app.Save(e.Auth); err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể lưu cài đặt giao diện")
	}
	return httpx.OK(e, 200, rbac.FormatUser(h.app, e.Auth))
}

func (h handler) changePassword(e *core.RequestEvent) error {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	if !e.Auth.ValidatePassword(req.CurrentPassword) {
		return httpx.Fail(e, 400, "INVALID_PASSWORD", "Mật khẩu hiện tại không đúng")
	}
	e.Auth.SetPassword(req.NewPassword)
	if err := h.app.Save(e.Auth); err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể đổi mật khẩu: "+err.Error())
	}
	return httpx.Message(e, "Đổi mật khẩu thành công")
}

// issueSession returns a fresh token. The duplicated top-level keys are kept for frontend compatibility.
func (h handler) issueSession(e *core.RequestEvent, user *core.Record, msg string) error {
	token, err := user.NewAuthToken()
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tạo phiên đăng nhập")
	}
	dto := rbac.FormatUser(h.app, user)

	e.SetCookie(&http.Cookie{Name: sessionCookie, Value: "1", Path: "/", MaxAge: 86400 * 30, SameSite: http.SameSiteLaxMode})

	body := map[string]any{
		"success":      true,
		"data":         map[string]any{"token": token, "access_token": token, "token_type": "Bearer", "user": dto},
		"token":        token,
		"access_token": token,
		"token_type":   "Bearer",
		"user":         dto,
	}
	if msg != "" {
		body["message"] = msg
	}
	return e.JSON(200, body)
}

func clearSessionCookie(e *core.RequestEvent) {
	e.SetCookie(&http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, SameSite: http.SameSiteLaxMode})
}
