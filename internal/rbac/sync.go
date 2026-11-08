package rbac

import (
	"fmt"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// SyncCatalog upserts all declared code permissions into the permissions collection
// and ensures default "admin" and "user" roles exist with proper permissions.
func SyncCatalog(app core.App) error {
	permColl, err := app.FindCollectionByNameOrId("permissions")
	if err != nil {
		return fmt.Errorf("permissions collection not found: %w", err)
	}

	rolesColl, err := app.FindCollectionByNameOrId("roles")
	if err != nil {
		return fmt.Errorf("roles collection not found: %w", err)
	}

	// 1. Upsert all permissions from code catalog
	var allPermIds []string
	var basicPermIds []string

	for _, item := range FlatCatalog() {
		records, err := app.FindRecordsByFilter(
			permColl,
			"code = {:code}",
			"",
			1,
			0,
			dbx.Params{"code": item.Code},
		)
		if err != nil {
			return fmt.Errorf("failed to query permission %s: %w", item.Code, err)
		}

		var record *core.Record
		if len(records) == 0 {
			record = core.NewRecord(permColl)
			record.Set("code", item.Code)
		} else {
			record = records[0]
		}

		record.Set("label", item.Label)
		record.Set("description", item.Description)
		record.Set("module", item.Module)

		if err := app.Save(record); err != nil {
			return fmt.Errorf("failed to save permission %s: %w", item.Code, err)
		}

		allPermIds = append(allPermIds, record.Id)
		if item.Code == PermUsersView || item.Code == PermNotificationsView || item.Code == PermMediaView {
			basicPermIds = append(basicPermIds, record.Id)
		}
	}

	// 2. Ensure "admin" role
	adminRoles, err := app.FindRecordsByFilter(
		rolesColl,
		"name = 'admin'",
		"",
		1,
		0,
	)
	if err != nil {
		return fmt.Errorf("failed to query admin role: %w", err)
	}

	if len(adminRoles) == 0 {
		adminRole := core.NewRecord(rolesColl)
		adminRole.Set("name", "admin")
		adminRole.Set("description", "Quản trị viên toàn quyền hệ thống")
		adminRole.Set("permissions", allPermIds)
		if err := app.Save(adminRole); err != nil {
			return fmt.Errorf("failed to create admin role: %w", err)
		}
	} else {
		adminRole := adminRoles[0]
		adminRole.Set("permissions", allPermIds)
		if err := app.Save(adminRole); err != nil {
			return fmt.Errorf("failed to update admin role permissions: %w", err)
		}
	}

	// 3. Ensure "user" role
	userRoles, err := app.FindRecordsByFilter(
		rolesColl,
		"name = 'user'",
		"",
		1,
		0,
	)
	if err != nil {
		return fmt.Errorf("failed to query user role: %w", err)
	}

	if len(userRoles) == 0 {
		userRole := core.NewRecord(rolesColl)
		userRole.Set("name", "user")
		userRole.Set("description", "Người dùng tiêu chuẩn")
		userRole.Set("permissions", basicPermIds)
		if err := app.Save(userRole); err != nil {
			return fmt.Errorf("failed to create user role: %w", err)
		}
	}

	// 4. Ensure default demo accounts exist
	usersColl, err := app.FindCollectionByNameOrId("users")
	if err == nil {
		adminRoleRecords, _ := app.FindRecordsByFilter(rolesColl, "name = 'admin'", "", 1, 0)
		var adminRoleId string
		if len(adminRoleRecords) > 0 {
			adminRoleId = adminRoleRecords[0].Id
		}

		userRoleRecords, _ := app.FindRecordsByFilter(rolesColl, "name = 'user'", "", 1, 0)
		var userRoleId string
		if len(userRoleRecords) > 0 {
			userRoleId = userRoleRecords[0].Id
		}

		// Ensure admin@example.com
		adminUser, _ := app.FindAuthRecordByEmail("users", "admin@example.com")
		if adminUser == nil {
			adminUser = core.NewRecord(usersColl)
			adminUser.Set("email", "admin@example.com")
			adminUser.Set("name", "System Administrator")
			adminUser.SetPassword("admin123")
		}
		if !adminUser.ValidatePassword("admin123") {
			adminUser.SetPassword("admin123")
		}
		if adminRoleId != "" {
			adminUser.Set("roles", []string{adminRoleId})
		}
		_ = app.Save(adminUser)

		// Ensure user@example.com
		normalUser, _ := app.FindAuthRecordByEmail("users", "user@example.com")
		if normalUser == nil {
			normalUser = core.NewRecord(usersColl)
			normalUser.Set("email", "user@example.com")
			normalUser.Set("name", "Demo User")
			normalUser.SetPassword("user123")
		}
		if !normalUser.ValidatePassword("user123") {
			normalUser.SetPassword("user123")
		}
		if userRoleId != "" {
			normalUser.Set("roles", []string{userRoleId})
		}
		_ = app.Save(normalUser)
	}

	// 5. Seed sample notifications if empty
	notifColl, err := app.FindCollectionByNameOrId("notifications")
	if err == nil {
		existingNotifs, _ := app.FindRecordsByFilter(notifColl, "", "", 1, 0)
		if len(existingNotifs) == 0 {
			n1 := core.NewRecord(notifColl)
			n1.Set("type", "system")
			n1.Set("title", "Chào mừng bạn đến với Business Admin Portal")
			n1.Set("body", "Hệ thống quản trị và phân quyền RBAC đã được khởi tạo thành công trên PocketBase.")
			_ = app.Save(n1)

			n2 := core.NewRecord(notifColl)
			n2.Set("type", "info")
			n2.Set("title", "Đồng bộ quyền hạn thành công")
			n2.Set("body", "Đã nạp 15 mã quyền hệ thống từ Code Catalog vào cơ sở dữ liệu.")
			_ = app.Save(n2)
		}
	}

	// 6. Seed sample audit logs if empty
	auditColl, err := app.FindCollectionByNameOrId("audit_logs")
	if err == nil {
		existingLogs, _ := app.FindRecordsByFilter(auditColl, "", "", 1, 0)
		if len(existingLogs) == 0 {
			logs := []struct {
				Action string
				Res    string
				Detail string
			}{
				{"sync_catalog", "permissions", "Đồng bộ 15 quyền hệ thống từ Code Catalog"},
				{"create", "roles", "Khởi tạo vai trò 'admin' với 100% quyền hạn"},
				{"create", "roles", "Khởi tạo vai trò 'user' người dùng tiêu chuẩn"},
				{"create", "users", "Khởi tạo tài khoản quản trị admin@example.com"},
				{"login", "auth", "Đăng nhập thành công vào Business Admin Portal"},
			}
			for _, l := range logs {
				rec := core.NewRecord(auditColl)
				rec.Set("actor_email", "admin@example.com")
				rec.Set("action", l.Action)
				rec.Set("resource", l.Res)
				rec.Set("status", "success")
				rec.Set("ip", "127.0.0.1")
				rec.Set("user_agent", "Mozilla/5.0 (Macintosh; Mac OS X)")
				rec.Set("detail", l.Detail)
				_ = app.Save(rec)
			}
		}
	}

	return nil
}

