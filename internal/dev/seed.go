// Package dev seeds demo data. It runs only when the server starts with --dev.
package dev

import (
	"fmt"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
)

type demoUser struct {
	email, password, name, role string
}

// Demo accounts used by the login form's quick-fill buttons.
var demoUsers = []demoUser{
	{"admin@example.com", "admin123", "System Administrator", rbac.RoleAdmin},
	{"user@example.com", "user123", "Demo User", rbac.RoleUser},
}

// Seed creates demo accounts and a welcome notification if they don't exist yet.
// Existing records are never modified.
func Seed(app core.App) error {
	for _, u := range demoUsers {
		if err := ensureUser(app, u); err != nil {
			return fmt.Errorf("seed %s: %w", u.email, err)
		}
	}
	return ensureWelcomeNotification(app)
}

func ensureUser(app core.App, u demoUser) error {
	if _, err := app.FindAuthRecordByEmail("users", u.email); err == nil {
		return nil
	}
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	role, err := app.FindFirstRecordByData("roles", "name", u.role)
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("email", u.email)
	rec.Set("name", u.name)
	rec.Set("verified", true)
	rec.Set("roles", []string{role.Id})
	rec.SetPassword(u.password)
	// Demo passwords are shorter than the users collection minimum; dev only.
	return app.SaveNoValidate(rec)
}

func ensureWelcomeNotification(app core.App) error {
	total, err := app.CountRecords("notifications")
	if err != nil || total > 0 {
		return err
	}
	col, err := app.FindCollectionByNameOrId("notifications")
	if err != nil {
		return err
	}
	n := core.NewRecord(col)
	n.Set("type", "system")
	n.Set("title", "Chào mừng bạn đến với Business Admin Portal")
	n.Set("body", "Hệ thống quản trị và phân quyền RBAC đã được khởi tạo thành công trên PocketBase.")
	return app.Save(n)
}
