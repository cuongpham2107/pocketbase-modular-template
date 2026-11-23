// Package dev seeds demo data. It runs only when the server starts with --dev.
package dev

import (
	"fmt"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/config"
)

// Seed creates demo accounts and a welcome notification if they don't exist yet.
// Existing records are never modified.
func Seed(app core.App) error {
	devCfg := config.Get().Dev
	for _, u := range devCfg.DemoUsers {
		if err := ensureUser(app, u); err != nil {
			return fmt.Errorf("seed %s: %w", u.Email, err)
		}
	}
	return ensureWelcomeNotification(app, devCfg.WelcomeNotification)
}

func ensureUser(app core.App, u config.DemoUser) error {
	if _, err := app.FindAuthRecordByEmail("users", u.Email); err == nil {
		return nil
	}
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	roleName := u.Role
	if roleName == "" {
		roleName = rbac.RoleUser
	}
	role, err := app.FindFirstRecordByData("roles", "name", roleName)
	if err != nil {
		return err
	}
	rec := core.NewRecord(col)
	rec.Set("email", u.Email)
	rec.Set("name", u.Name)
	rec.Set("verified", true)
	rec.Set("roles", []string{role.Id})
	rec.SetPassword(u.Password)
	// Demo passwords are shorter than the users collection minimum; dev only.
	return app.SaveNoValidate(rec)
}

func ensureWelcomeNotification(app core.App, welcome config.WelcomeNotification) error {
	if welcome.Title == "" {
		return nil
	}
	total, err := app.CountRecords("notifications")
	if err != nil || total > 0 {
		return err
	}
	col, err := app.FindCollectionByNameOrId("notifications")
	if err != nil {
		return err
	}
	typ := welcome.Type
	if typ == "" {
		typ = "system"
	}
	n := core.NewRecord(col)
	n.Set("type", typ)
	n.Set("title", welcome.Title)
	n.Set("body", welcome.Body)
	return app.Save(n)
}
