package rbac

import (
	"fmt"
	"slices"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// RoleDTO is the role payload the frontend expects.
type RoleDTO struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// PermissionDTO is the permission payload the frontend expects.
type PermissionDTO struct {
	ID           string  `json:"id"`
	Code         string  `json:"code"`
	Label        string  `json:"label"`
	Description  string  `json:"description"`
	Module       string  `json:"module"`
	DeprecatedAt *string `json:"deprecated_at"`
	IsActive     bool    `json:"is_active"`
}

// CoverageDTO compares the code catalog with roles in the DB.
type CoverageDTO struct {
	TotalCatalog       int      `json:"total_catalog"`
	TotalActiveInDb    int      `json:"total_active_in_db"`
	TotalAssignedRoles int      `json:"total_assigned_roles"`
	UnassignedCodes    []string `json:"unassigned_codes"`
	DeprecatedAssigned []string `json:"deprecated_assigned"`
}

func formatRoles(app core.App, roles []*core.Record) []*RoleDTO {
	app.ExpandRecords(roles, []string{"permissions"}, nil)
	out := make([]*RoleDTO, 0, len(roles))
	for _, r := range roles {
		codes := []string{}
		for _, p := range r.ExpandedAll("permissions") {
			codes = append(codes, p.GetString("code"))
		}
		out = append(out, &RoleDTO{
			ID: r.Id, Name: r.GetString("name"), Description: r.GetString("description"), Permissions: codes,
		})
	}
	return out
}

func formatPermission(p *core.Record, active bool) *PermissionDTO {
	return &PermissionDTO{
		ID: p.Id, Code: p.GetString("code"), Label: p.GetString("label"),
		Description: p.GetString("description"), Module: p.GetString("module"), IsActive: active,
	}
}

// idsByField resolves values of a unique field to record ids, failing on any unknown value.
func idsByField(app core.App, collection, field string, values []string) ([]string, error) {
	if len(values) == 0 {
		return []string{}, nil
	}
	args := make([]any, len(values))
	for i, v := range values {
		args[i] = v
	}
	recs, err := app.FindAllRecords(collection, dbx.In(field, args...))
	if err != nil {
		return nil, err
	}
	found := make(map[string]string, len(recs))
	for _, r := range recs {
		found[r.GetString(field)] = r.Id
	}
	ids := make([]string, 0, len(values))
	var missing []string
	for _, v := range values {
		id, ok := found[v]
		if !ok {
			missing = append(missing, v)
			continue
		}
		if !slices.Contains(ids, id) {
			ids = append(ids, id)
		}
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("%s không tồn tại: %s", collection, strings.Join(missing, ", "))
	}
	return ids, nil
}

// AssignPermissionsToRole replaces a role's permissions with the given codes.
func AssignPermissionsToRole(app core.App, roleID string, codes []string) error {
	role, err := app.FindRecordById("roles", roleID)
	if err != nil {
		return fmt.Errorf("vai trò không tồn tại")
	}
	ids, err := idsByField(app, "permissions", "code", codes)
	if err != nil {
		return err
	}
	role.Set("permissions", ids)
	return app.Save(role)
}

// AssignRolesToUser replaces a user's roles with the given role names.
func AssignRolesToUser(app core.App, userID string, roleNames []string) error {
	user, err := app.FindRecordById("users", userID)
	if err != nil {
		return fmt.Errorf("người dùng không tồn tại")
	}
	ids, err := idsByField(app, "roles", "name", roleNames)
	if err != nil {
		return err
	}
	user.Set("roles", ids)
	return app.Save(user)
}

// AddUsersToRole appends a role to each user, atomically.
func AddUsersToRole(app core.App, roleID string, userIDs []string) error {
	if _, err := app.FindRecordById("roles", roleID); err != nil {
		return fmt.Errorf("vai trò không tồn tại")
	}
	return app.RunInTransaction(func(tx core.App) error {
		for _, uid := range userIDs {
			u, err := tx.FindRecordById("users", uid)
			if err != nil {
				return fmt.Errorf("người dùng %s không tồn tại", uid)
			}
			roles := u.GetStringSlice("roles")
			if slices.Contains(roles, roleID) {
				continue
			}
			u.Set("roles", append(roles, roleID))
			if err := tx.Save(u); err != nil {
				return err
			}
		}
		return nil
	})
}

// CreateRole creates a role with its permissions in one transaction.
func CreateRole(app core.App, name, description string, codes []string) (*core.Record, error) {
	var role *core.Record
	err := app.RunInTransaction(func(tx core.App) error {
		col, err := tx.FindCollectionByNameOrId("roles")
		if err != nil {
			return err
		}
		ids, err := idsByField(tx, "permissions", "code", codes)
		if err != nil {
			return err
		}
		role = core.NewRecord(col)
		role.Set("name", strings.TrimSpace(name))
		role.Set("description", strings.TrimSpace(description))
		role.Set("permissions", ids)
		return tx.Save(role)
	})
	return role, err
}

// Coverage reports catalog permissions that no role grants.
func Coverage(app core.App, catalog []Group) (*CoverageDTO, error) {
	total, err := app.CountRecords("permissions")
	if err != nil {
		return nil, err
	}
	roles, err := app.FindAllRecords("roles")
	if err != nil {
		return nil, err
	}
	app.ExpandRecords(roles, []string{"permissions"}, nil)

	assigned := map[string]bool{}
	for _, r := range roles {
		for _, p := range r.ExpandedAll("permissions") {
			assigned[p.GetString("code")] = true
		}
	}

	items := flatten(catalog)
	inCatalog := map[string]bool{}
	unassigned := []string{}
	for _, it := range items {
		inCatalog[it.Code] = true
		if !assigned[it.Code] {
			unassigned = append(unassigned, it.Code)
		}
	}
	deprecated := []string{}
	for code := range assigned {
		if !inCatalog[code] {
			deprecated = append(deprecated, code)
		}
	}
	slices.Sort(deprecated)

	return &CoverageDTO{
		TotalCatalog:       len(items),
		TotalActiveInDb:    int(total),
		TotalAssignedRoles: len(roles),
		UnassignedCodes:    unassigned,
		DeprecatedAssigned: deprecated,
	}, nil
}
