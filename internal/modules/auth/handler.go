package auth

import (
	"errors"
	"net/http"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

// sessionCookie is a non-secret UI hint ("a session probably exists"); the real credential is the Bearer token.
const sessionCookie = "has_session"

type handler struct {
	svc service
}

func (h handler) login(e *core.RequestEvent) error {
	var in LoginInput
	if err := e.BindBody(&in); err != nil {
		return httpx.BadRequest(e)
	}
	sess, err := h.svc.Login(in)
	if errors.Is(err, ErrInvalidCredentials) {
		return httpx.Fail(e, 401, "UNAUTHORIZED", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tạo phiên đăng nhập")
	}
	return writeSession(e, sess, "Đăng nhập thành công")
}

func (h handler) register(e *core.RequestEvent) error {
	var in RegisterInput
	if err := e.BindBody(&in); err != nil {
		return httpx.BadRequest(e)
	}
	sess, err := h.svc.Register(in)
	if errors.Is(err, ErrUsersCollectionMissing) {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể tạo tài khoản: "+err.Error())
	}
	return writeSession(e, sess, "Đăng ký thành công")
}

func (h handler) refresh(e *core.RequestEvent) error {
	sess, err := h.svc.Refresh(e.Auth)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tạo phiên đăng nhập")
	}
	return writeSession(e, sess, "")
}

func (h handler) logout(e *core.RequestEvent) error {
	clearSessionCookie(e)
	return httpx.Message(e, "Đã đăng xuất")
}

func (h handler) logoutAll(e *core.RequestEvent) error {
	if err := h.svc.LogoutAll(e.Auth); err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể đăng xuất các thiết bị")
	}
	clearSessionCookie(e)
	return httpx.Message(e, "Đã đăng xuất tất cả thiết bị")
}

func (h handler) me(e *core.RequestEvent) error {
	return httpx.OK(e, 200, h.svc.Me(e.Auth))
}

func (h handler) saveTheme(e *core.RequestEvent) error {
	var req struct {
		ThemeSettings string `json:"theme_settings"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	dto, err := h.svc.SaveTheme(e.Auth, req.ThemeSettings)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể lưu cài đặt giao diện")
	}
	return httpx.OK(e, 200, dto)
}

func (h handler) changePassword(e *core.RequestEvent) error {
	var in ChangePasswordInput
	if err := e.BindBody(&in); err != nil {
		return httpx.BadRequest(e)
	}
	err := h.svc.ChangePassword(e.Auth, in)
	if errors.Is(err, ErrInvalidPassword) {
		return httpx.Fail(e, 400, "INVALID_PASSWORD", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể đổi mật khẩu: "+err.Error())
	}
	return httpx.Message(e, "Đổi mật khẩu thành công")
}

// writeSession sets the UI hint cookie and returns a fresh token.
// The duplicated top-level keys are kept for frontend compatibility.
func writeSession(e *core.RequestEvent, sess *Session, msg string) error {
	e.SetCookie(&http.Cookie{Name: sessionCookie, Value: "1", Path: "/", MaxAge: 86400 * 30, SameSite: http.SameSiteLaxMode})

	body := map[string]any{
		"success":      true,
		"data":         map[string]any{"token": sess.Token, "access_token": sess.Token, "token_type": "Bearer", "user": sess.User},
		"token":        sess.Token,
		"access_token": sess.Token,
		"token_type":   "Bearer",
		"user":         sess.User,
	}
	if msg != "" {
		body["message"] = msg
	}
	return e.JSON(200, body)
}

func clearSessionCookie(e *core.RequestEvent) {
	e.SetCookie(&http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, SameSite: http.SameSiteLaxMode})
}
