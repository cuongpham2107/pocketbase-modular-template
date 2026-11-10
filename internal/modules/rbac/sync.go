package rbac

import (
	"fmt"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

// Sync upserts every catalog permission and ensures the built-in roles exist.
// "admin" always receives every permission; "user" receives the Basic ones only when first created.
// Permissions removed from code stay in the DB and are reported by the coverage endpoint.
func Sync(app core.App, catalog []Group) error {
	return app.RunInTransaction(func(tx core.App) error {
		col, err := tx.FindCollectionByNameOrId("permissions")
		if err != nil {
			return fmt.Errorf("permissions collection not found (run migrations): %w", err)
		}
		existing, err := tx.FindAllRecords(col)
		if err != nil {
			return err
		}
		byCode := make(map[string]*core.Record, len(existing))
		for _, r := range existing {
			byCode[r.GetString("code")] = r
		}

		var allIDs, basicIDs []string
		for _, item := range flatten(catalog) {
			rec := byCode[item.Code]
			if rec == nil {
				rec = core.NewRecord(col)
				rec.Set("code", item.Code)
			}
			rec.Set("label", item.Label)
			rec.Set("description", item.Description)
			rec.Set("module", item.Module)
			if err := tx.Save(rec); err != nil {
				return fmt.Errorf("save permission %s: %w", item.Code, err)
			}
			allIDs = append(allIDs, rec.Id)
			if item.Basic {
				basicIDs = append(basicIDs, rec.Id)
			}
		}

		if err := ensureRole(tx, RoleAdmin, "Quản trị viên toàn quyền hệ thống", allIDs, true); err != nil {
			return err
		}
		return ensureRole(tx, RoleUser, "Người dùng tiêu chuẩn", basicIDs, false)
	})
}

func ensureRole(app core.App, name, description string, permIDs []string, overwrite bool) error {
	role, err := app.FindFirstRecordByData("roles", "name", name)
	if err != nil {
		col, err := app.FindCollectionByNameOrId("roles")
		if err != nil {
			return err
		}
		role = core.NewRecord(col)
		role.Set("name", name)
		role.Set("description", description)
	} else if !overwrite {
		return nil
	}
	role.Set("permissions", permIDs)
	if err := app.Save(role); err != nil {
		return fmt.Errorf("save role %s: %w", name, err)
	}
	return nil
}
