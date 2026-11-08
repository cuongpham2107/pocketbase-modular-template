package rbac

import (
	"fmt"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// RegisterCollections creates or updates the permissions, roles, and users collections in PocketBase.
func RegisterCollections(app core.App) error {
	// 1. permissions collection
	permColl, err := app.FindCollectionByNameOrId("permissions")
	if err != nil {
		permColl = core.NewBaseCollection("permissions")
		authRule := "@request.auth.id != ''"
		permColl.ListRule = &authRule
		permColl.ViewRule = &authRule
		permColl.CreateRule = &authRule
		permColl.UpdateRule = &authRule
		permColl.DeleteRule = &authRule

		permColl.Fields.Add(
			&core.TextField{Name: "code", Required: true},
			&core.TextField{Name: "label"},
			&core.TextField{Name: "description"},
			&core.TextField{Name: "module", Required: true},
		)
		permColl.AddIndex("idx_permissions_code", true, "code", "")

		if err := app.Save(permColl); err != nil {
			return fmt.Errorf("failed to create permissions collection: %w", err)
		}
	}

	// 2. roles collection
	rolesColl, err := app.FindCollectionByNameOrId("roles")
	if err != nil {
		rolesColl = core.NewBaseCollection("roles")
		authRule := "@request.auth.id != ''"
		rolesColl.ListRule = &authRule
		rolesColl.ViewRule = &authRule
		rolesColl.CreateRule = &authRule
		rolesColl.UpdateRule = &authRule
		rolesColl.DeleteRule = &authRule

		rolesColl.Fields.Add(
			&core.TextField{Name: "name", Required: true},
			&core.TextField{Name: "description"},
			&core.RelationField{
				Name:         "permissions",
				CollectionId: permColl.Id,
				MaxSelect:    999,
			},
		)
		rolesColl.AddIndex("idx_roles_name", true, "name", "")

		if err := app.Save(rolesColl); err != nil {
			return fmt.Errorf("failed to create roles collection: %w", err)
		}
	}

	// 3. users collection - extend with 'roles' and 'theme_settings'
	usersColl, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return fmt.Errorf("users collection not found: %w", err)
	}

	needSaveUsers := false
	if usersColl.Fields.GetByName("roles") == nil {
		usersColl.Fields.Add(&core.RelationField{
			Name:         "roles",
			CollectionId: rolesColl.Id,
			MaxSelect:    999,
		})
		needSaveUsers = true
	}
	if usersColl.Fields.GetByName("theme_settings") == nil {
		usersColl.Fields.Add(&core.TextField{
			Name: "theme_settings",
			Max:  50000,
		})
		needSaveUsers = true
	}

	// Allow passwords with at least 6 characters (for demo user123)
	if pf, ok := usersColl.Fields.GetByName("password").(*core.PasswordField); ok && pf.Min > 6 {
		pf.Min = 6
		needSaveUsers = true
	}

	// Make sure users list & view rules allow authenticated users to view users
	if usersColl.ListRule == nil || *usersColl.ListRule == "" {
		rule := "@request.auth.id != ''"
		usersColl.ListRule = &rule
		needSaveUsers = true
	}
	if usersColl.ViewRule == nil || *usersColl.ViewRule == "" {
		rule := "@request.auth.id != ''"
		usersColl.ViewRule = &rule
		needSaveUsers = true
	}

	if needSaveUsers {
		if err := app.Save(usersColl); err != nil {
			return fmt.Errorf("failed to update users collection: %w", err)
		}
	}

	// 4. notifications collection
	notifColl, err := app.FindCollectionByNameOrId("notifications")
	if err != nil {
		notifColl = core.NewBaseCollection("notifications")
		authRule := "@request.auth.id != ''"
		notifColl.ListRule = &authRule
		notifColl.ViewRule = &authRule
		notifColl.CreateRule = &authRule
		notifColl.UpdateRule = &authRule
		notifColl.DeleteRule = &authRule

		notifColl.Fields.Add(
			&core.TextField{Name: "user_id"},
			&core.TextField{Name: "type"},
			&core.TextField{Name: "title", Required: true},
			&core.TextField{Name: "body"},
			&core.TextField{Name: "data"},
			&core.TextField{Name: "read_at"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)

		if err := app.Save(notifColl); err != nil {
			return fmt.Errorf("failed to create notifications collection: %w", err)
		}
	} else if notifColl.Fields.GetByName("created") == nil {
		notifColl.Fields.Add(
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		_ = app.Save(notifColl)
	}

	// 5. audit_logs collection
	auditColl, err := app.FindCollectionByNameOrId("audit_logs")
	if err != nil {
		auditColl = core.NewBaseCollection("audit_logs")
		authRule := "@request.auth.id != ''"
		auditColl.ListRule = &authRule
		auditColl.ViewRule = &authRule
		auditColl.CreateRule = &authRule
		auditColl.UpdateRule = &authRule
		auditColl.DeleteRule = &authRule

		auditColl.Fields.Add(
			&core.TextField{Name: "actor_id"},
			&core.TextField{Name: "actor_email"},
			&core.TextField{Name: "action", Required: true},
			&core.TextField{Name: "resource"},
			&core.TextField{Name: "resource_id"},
			&core.TextField{Name: "status"},
			&core.TextField{Name: "ip"},
			&core.TextField{Name: "user_agent"},
			&core.TextField{Name: "detail"},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)

		if err := app.Save(auditColl); err != nil {
			return fmt.Errorf("failed to create audit_logs collection: %w", err)
		}
	} else if auditColl.Fields.GetByName("created") == nil {
		auditColl.Fields.Add(
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		_ = app.Save(auditColl)
	}

	return nil
}

