package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

// Locks the native /api/collections/* read rules so they can no longer bypass RBAC.
//
// Every business read goes through /api/v1/<module>, guarded by rbac.Require.
// Leaving ListRule/ViewRule as "any signed-in user" let a user without, say,
// media:view read every file record (or every user's email) straight from the
// native records API. Users may still read their own record; everything else
// is superuser-only on the native API. Non-protected file fields keep being
// served by /api/files, so media URLs keep working.

// lockedCollections are readable only through the module APIs.
var lockedCollections = []string{"permissions", "roles", "media_folders", "media_files"}

// selfOnly lets a user read only their own record.
var selfOnly = types.Pointer("id = @request.auth.id")

func init() {
	m.Register(func(app core.App) error {
		for _, name := range lockedCollections {
			if err := setReadRule(app, name, nil); err != nil {
				return err
			}
		}
		return setReadRule(app, "users", selfOnly)
	}, func(app core.App) error {
		for _, name := range append(lockedCollections, "users") {
			if err := setReadRule(app, name, authOnly); err != nil {
				return err
			}
		}
		return nil
	})
}

func setReadRule(app core.App, name string, rule *string) error {
	c, err := app.FindCollectionByNameOrId(name)
	if err != nil {
		return nil // collection not created on this database; nothing to lock
	}
	c.ListRule, c.ViewRule = rule, rule
	return app.Save(c)
}
