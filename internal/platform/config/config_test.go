package config

import "testing"

func TestGetReturnsValidDefaultsAndClonedSlices(t *testing.T) {
	cfg := Get()
	if cfg.App.AdminDir != "./pb_public/admin" {
		t.Fatalf("AdminDir = %q, want ./pb_public/admin", cfg.App.AdminDir)
	}
	if cfg.Pagination.DefaultLimit <= 0 || cfg.Pagination.UsersLimit <= 0 || cfg.Pagination.MaxPageSize <= 0 {
		t.Fatalf("invalid pagination config: %+v", cfg.Pagination)
	}
	if cfg.Notifications.CleanupCron == "" || cfg.Notifications.CleanupRetentionDays <= 0 {
		t.Fatalf("invalid notifications config: %+v", cfg.Notifications)
	}
	if cfg.Media.DefaultFolderColor == "" {
		t.Fatal("DefaultFolderColor must not be empty")
	}
	if len(cfg.App.FrontendModules) == 0 || len(cfg.Dev.DemoUsers) == 0 {
		t.Fatalf("expected non-empty FrontendModules and DemoUsers: %+v", cfg)
	}

	// Mutating returned slices must not affect subsequent Get() calls.
	cfg.App.FrontendModules[0] = "mutated"
	if Get().App.FrontendModules[0] == "mutated" {
		t.Fatal("Get() leaked mutable slice reference")
	}
}
