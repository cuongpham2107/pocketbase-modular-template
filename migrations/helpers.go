// Package migrations holds every schema change as a Go migration.
// Collections, fields, indexes and API rules live here only — never in boot hooks.
// Editing collections in the Studio (/_/) with --dev auto-generates new files here.
package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

// authOnly lets any signed-in record read. Writes default to nil (superuser only);
// business writes go through /api/v1 handlers guarded by rbac.Require.
var authOnly = types.Pointer("@request.auth.id != ''")

// findOrNewBase returns the existing collection or a fresh base collection.
// The first migrations must be idempotent because older databases already
// have these collections (created by the former boot-time schema code).
func findOrNewBase(app core.App, name string) *core.Collection {
	if c, err := app.FindCollectionByNameOrId(name); err == nil {
		return c
	}
	return core.NewBaseCollection(name)
}

// addMissing adds fields that don't exist yet, never replacing existing ones (keeps column data).
func addMissing(c *core.Collection, fields ...core.Field) {
	for _, f := range fields {
		if c.Fields.GetByName(f.GetName()) == nil {
			c.Fields.Add(f)
		}
	}
}

func timestamps() []core.Field {
	return []core.Field{
		&core.AutodateField{Name: "created", OnCreate: true},
		&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
	}
}

func deleteIfExists(app core.App, name string) error {
	c, err := app.FindCollectionByNameOrId(name)
	if err != nil {
		return nil
	}
	return app.Delete(c)
}
