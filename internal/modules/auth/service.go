package auth

import (
	"errors"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
)

var (
	ErrInvalidCredentials     = errors.New("Email hoặc mật khẩu không chính xác")
	ErrInvalidPassword        = errors.New("Mật khẩu hiện tại không đúng")
	ErrUsersCollectionMissing = errors.New("Collection users không tồn tại")
)

type service struct {
	app core.App
}

// LoginInput is the sign-in payload.
type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterInput is the sign-up payload.
type RegisterInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

// ChangePasswordInput is the password-change payload.
type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// Session is the issued auth token alongside the formatted user DTO.
type Session struct {
	Token string
	User  *rbac.UserDTO
}

func (s service) Login(in LoginInput) (*Session, error) {
	user, err := s.app.FindAuthRecordByEmail("users", strings.TrimSpace(in.Email))
	if err != nil || !user.ValidatePassword(in.Password) {
		return nil, ErrInvalidCredentials
	}
	return s.issueSession(user)
}

func (s service) Register(in RegisterInput) (*Session, error) {
	col, err := s.app.FindCollectionByNameOrId("users")
	if err != nil {
		return nil, ErrUsersCollectionMissing
	}

	user := core.NewRecord(col)
	user.Set("email", strings.TrimSpace(in.Email))
	user.Set("name", strings.TrimSpace(in.FullName))
	user.SetPassword(in.Password)
	if role, err := s.app.FindFirstRecordByData("roles", "name", rbac.RoleUser); err == nil {
		user.Set("roles", []string{role.Id})
	}
	if err := s.app.Save(user); err != nil {
		return nil, err
	}
	return s.issueSession(user)
}

func (s service) Refresh(user *core.Record) (*Session, error) {
	return s.issueSession(user)
}

// LogoutAll rotates the token key, which invalidates every token issued for this user.
func (s service) LogoutAll(user *core.Record) error {
	user.RefreshTokenKey()
	return s.app.Save(user)
}

func (s service) Me(user *core.Record) *rbac.UserDTO {
	return rbac.FormatUser(s.app, user)
}

func (s service) SaveTheme(user *core.Record, themeSettings string) (*rbac.UserDTO, error) {
	user.Set("theme_settings", themeSettings)
	if err := s.app.Save(user); err != nil {
		return nil, err
	}
	return rbac.FormatUser(s.app, user), nil
}

func (s service) ChangePassword(user *core.Record, in ChangePasswordInput) error {
	if !user.ValidatePassword(in.CurrentPassword) {
		return ErrInvalidPassword
	}
	user.SetPassword(in.NewPassword)
	return s.app.Save(user)
}

func (s service) issueSession(user *core.Record) (*Session, error) {
	token, err := user.NewAuthToken()
	if err != nil {
		return nil, err
	}
	return &Session{
		Token: token,
		User:  rbac.FormatUser(s.app, user),
	}, nil
}
