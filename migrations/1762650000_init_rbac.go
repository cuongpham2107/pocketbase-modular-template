package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		perms := findOrNewBase(app, "permissions")
		addMissing(perms,
			&core.TextField{Name: "code", Required: true},
			&core.TextField{Name: "label"},
			&core.TextField{Name: "description"},
			&core.TextField{Name: "module", Required: true},
		)
		perms.AddIndex("idx_permissions_code", true, "code", "")
		perms.ListRule, perms.ViewRule = authOnly, authOnly
		perms.CreateRule, perms.UpdateRule, perms.DeleteRule = nil, nil, nil
		if err := app.Save(perms); err != nil {
			return err
		}

		roles := findOrNewBase(app, "roles")
		addMissing(roles,
			&core.TextField{Name: "name", Required: true},
			&core.TextField{Name: "description"},
			&core.RelationField{Name: "permissions", CollectionId: perms.Id, MaxSelect: 999},
		)
		roles.AddIndex("idx_roles_name", true, "name", "")
		roles.ListRule, roles.ViewRule = authOnly, authOnly
		roles.CreateRule, roles.UpdateRule, roles.DeleteRule = nil, nil, nil
		if err := app.Save(roles); err != nil {
			return err
		}

		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		addMissing(users,
			&core.RelationField{Name: "roles", CollectionId: roles.Id, MaxSelect: 999},
			&core.TextField{Name: "theme_settings", Max: 50000},
		)
		users.ListRule, users.ViewRule = authOnly, authOnly
		// Users may edit their own profile but never their own roles (privilege escalation).
		users.UpdateRule = types.Pointer("id = @request.auth.id && @request.body.roles:isset = false")
		if err := app.Save(users); err != nil {
			return err
		}

		// The audit module reads request logs and needs the actor id in them.
		settings := app.Settings()
		settings.Logs.LogAuthId = true
		return app.Save(settings)
	}, func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err == nil {
			users.Fields.RemoveByName("roles")
			users.Fields.RemoveByName("theme_settings")
			if err := app.Save(users); err != nil {
				return err
			}
		}
		if err := deleteIfExists(app, "roles"); err != nil {
			return err
		}
		return deleteIfExists(app, "permissions")
	})
}
