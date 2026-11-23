// Package config holds centralized runtime settings for the application.
package config

import "slices"

type Config struct {
	App           AppConfig
	Pagination    PaginationConfig
	Audit         AuditConfig
	Notifications NotificationsConfig
	Media         MediaConfig
	Dev           DevConfig
}

type AppConfig struct {
	AdminDir        string
	FrontendModules []string
}

type PaginationConfig struct {
	DefaultLimit int
	UsersLimit   int
	MaxPageSize  int
}

type AuditConfig struct {
	HiddenPaths []string
	Actions     []string
	Resources   []string
}

type NotificationsConfig struct {
	CleanupCron          string
	CleanupRetentionDays int
}

type MediaConfig struct {
	DefaultFolderColor string
}

type DemoUser struct {
	Email    string
	Password string
	Name     string
	Role     string
}

type WelcomeNotification struct {
	Type  string
	Title string
	Body  string
}

type DevConfig struct {
	DemoUsers           []DemoUser
	WelcomeNotification WelcomeNotification
}

var defaults = Config{
	App: AppConfig{
		AdminDir:        "./pb_public/admin",
		FrontendModules: []string{"rbac", "users", "theme", "audit", "notifications", "media"},
	},
	Pagination: PaginationConfig{
		DefaultLimit: 20,
		UsersLimit:   10,
		MaxPageSize:  100,
	},
	Audit: AuditConfig{
		HiddenPaths: []string{"/notifications/stream", "/health", "/notifications/unread-count"},
		Actions:     []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
		Resources:   []string{"auth", "users", "roles", "permissions", "notifications", "audit-logs", "files", "system"},
	},
	Notifications: NotificationsConfig{
		CleanupCron:          "0 3 * * *",
		CleanupRetentionDays: 30,
	},
	Media: MediaConfig{
		DefaultFolderColor: "#3b82f6",
	},
	Dev: DevConfig{
		DemoUsers: []DemoUser{
			{Email: "admin@example.com", Password: "admin123", Name: "System Administrator", Role: "admin"},
			{Email: "user@example.com", Password: "user123", Name: "Demo User", Role: "user"},
		},
		WelcomeNotification: WelcomeNotification{
			Type:  "system",
			Title: "Chào mừng bạn đến với Business Admin Portal",
			Body:  "Hệ thống quản trị và phân quyền RBAC đã được khởi tạo thành công trên PocketBase.",
		},
	},
}

// Get returns a copy of the centralized application configuration.
func Get() Config {
	cfg := defaults
	cfg.App.FrontendModules = slices.Clone(defaults.App.FrontendModules)
	cfg.Audit.HiddenPaths = slices.Clone(defaults.Audit.HiddenPaths)
	cfg.Audit.Actions = slices.Clone(defaults.Audit.Actions)
	cfg.Audit.Resources = slices.Clone(defaults.Audit.Resources)
	cfg.Dev.DemoUsers = slices.Clone(defaults.Dev.DemoUsers)
	return cfg
}
