package rbac

import (
	"fmt"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// UserDTO represents the user payload expected by the frontend
type UserDTO struct {
	ID            string   `json:"id"`
	Email         string   `json:"email"`
	FullName      string   `json:"full_name"`
	Name          string   `json:"name"`
	Role          string   `json:"role"`
	Roles         []string `json:"roles"`
	Permissions   []string `json:"permissions"`
	ThemeSettings string   `json:"theme_settings,omitempty"`
	AvatarURL     string   `json:"avatar_url,omitempty"`
	CreatedAt     string   `json:"created_at"`
}

// RoleDTO represents the role payload expected by the frontend
type RoleDTO struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// PermissionDTO represents the permission payload expected by the frontend
type PermissionDTO struct {
	ID           string  `json:"id"`
	Code         string  `json:"code"`
	Label        string  `json:"label"`
	Description  string  `json:"description"`
	Module       string  `json:"module"`
	DeprecatedAt *string `json:"deprecated_at"`
	IsActive     bool    `json:"is_active"`
}

// CoverageDTO matches frontend CoverageReport
type CoverageDTO struct {
	TotalCatalog       int      `json:"total_catalog"`
	TotalActiveInDb    int      `json:"total_active_in_db"`
	TotalAssignedRoles int      `json:"total_assigned_roles"`
	UnassignedCodes    []string `json:"unassigned_codes"`
	DeprecatedAssigned []string `json:"deprecated_assigned"`
}

// FormatUser formats a pocketbase user record into UserDTO
func FormatUser(app core.App, user *core.Record) (*UserDTO, error) {
	if user == nil {
		return nil, nil
	}

	// Expand roles and their permissions if not already expanded
	_ = app.ExpandRecord(user, []string{"roles", "roles.permissions"}, nil)

	var roleNames []string
	permSet := make(map[string]bool)

	roles := user.ExpandedAll("roles")
	for _, r := range roles {
		roleName := r.GetString("name")
		if roleName != "" {
			roleNames = append(roleNames, roleName)
		}
		perms := r.ExpandedAll("permissions")
		for _, p := range perms {
			code := p.GetString("code")
			if code != "" {
				permSet[code] = true
			}
		}
	}

	primaryRole := "user"
	if len(roleNames) > 0 {
		primaryRole = roleNames[0]
	}

	var permList []string
	for p := range permSet {
		permList = append(permList, p)
	}

	name := user.GetString("name")
	if name == "" {
		name = strings.Split(user.GetString("email"), "@")[0]
	}

	return &UserDTO{
		ID:            user.Id,
		Email:         user.GetString("email"),
		FullName:      name,
		Name:          name,
		Role:          primaryRole,
		Roles:         roleNames,
		Permissions:   permList,
		ThemeSettings: user.GetString("theme_settings"),
		CreatedAt:     user.GetString("created"),
	}, nil
}

// FormatRole formats a pocketbase role record into RoleDTO
func FormatRole(app core.App, role *core.Record) (*RoleDTO, error) {
	if role == nil {
		return nil, nil
	}

	_ = app.ExpandRecord(role, []string{"permissions"}, nil)

	var permCodes []string
	perms := role.ExpandedAll("permissions")
	for _, p := range perms {
		code := p.GetString("code")
		if code != "" {
			permCodes = append(permCodes, code)
		}
	}

	return &RoleDTO{
		ID:          role.Id,
		Name:        role.GetString("name"),
		Description: role.GetString("description"),
		Permissions: permCodes,
	}, nil
}

// FormatPermission formats a pocketbase permission record into PermissionDTO
func FormatPermission(perm *core.Record) *PermissionDTO {
	if perm == nil {
		return nil
	}
	return &PermissionDTO{
		ID:          perm.Id,
		Code:        perm.GetString("code"),
		Label:       perm.GetString("label"),
		Description: perm.GetString("description"),
		Module:      perm.GetString("module"),
		IsActive:    true,
	}
}

// GetCoverageReport calculates coverage between catalog, DB, and roles
func GetCoverageReport(app core.App) (*CoverageDTO, error) {
	permColl, err := app.FindCollectionByNameOrId("permissions")
	if err != nil {
		return nil, err
	}
	rolesColl, err := app.FindCollectionByNameOrId("roles")
	if err != nil {
		return nil, err
	}

	allCatalog := FlatCatalog()
	catalogMap := make(map[string]bool)
	for _, c := range allCatalog {
		catalogMap[c.Code] = true
	}

	dbPerms, err := app.FindRecordsByFilter(permColl, "", "", 0, 0)
	if err != nil {
		return nil, err
	}

	dbPermMap := make(map[string]string) // id -> code
	for _, p := range dbPerms {
		dbPermMap[p.Id] = p.GetString("code")
	}

	roles, err := app.FindRecordsByFilter(rolesColl, "", "", 0, 0)
	if err != nil {
		return nil, err
	}

	assignedPermCodes := make(map[string]bool)
	for _, r := range roles {
		_ = app.ExpandRecord(r, []string{"permissions"}, nil)
		for _, p := range r.ExpandedAll("permissions") {
			code := p.GetString("code")
			if code != "" {
				assignedPermCodes[code] = true
			}
		}
	}

	var unassignedCodes []string
	for _, c := range allCatalog {
		if !assignedPermCodes[c.Code] {
			unassignedCodes = append(unassignedCodes, c.Code)
		}
	}

	return &CoverageDTO{
		TotalCatalog:       len(allCatalog),
		TotalActiveInDb:    len(dbPerms),
		TotalAssignedRoles: len(roles),
		UnassignedCodes:    unassignedCodes,
		DeprecatedAssigned: []string{},
	}, nil
}

// AssignPermissionsToRole replaces all permissions of a role with the given codes
func AssignPermissionsToRole(app core.App, roleId string, permissionCodes []string) error {
	role, err := app.FindRecordById("roles", roleId)
	if err != nil {
		return fmt.Errorf("role not found: %w", err)
	}

	permColl, err := app.FindCollectionByNameOrId("permissions")
	if err != nil {
		return err
	}

	var targetIds []string
	for _, code := range permissionCodes {
		perms, err := app.FindRecordsByFilter(permColl, "code = {:code}", "", 1, 0, map[string]any{"code": code})
		if err == nil && len(perms) > 0 {
			targetIds = append(targetIds, perms[0].Id)
		}
	}

	role.Set("permissions", targetIds)
	return app.Save(role)
}

// AssignRolesToUser replaces all roles of a user with the given role names
func AssignRolesToUser(app core.App, userId string, roleNames []string) error {
	user, err := app.FindRecordById("users", userId)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	rolesColl, err := app.FindCollectionByNameOrId("roles")
	if err != nil {
		return err
	}

	var targetIds []string
	for _, rName := range roleNames {
		roles, err := app.FindRecordsByFilter(rolesColl, "name = {:name}", "", 1, 0, map[string]any{"name": rName})
		if err == nil && len(roles) > 0 {
			targetIds = append(targetIds, roles[0].Id)
		}
	}

	user.Set("roles", targetIds)
	return app.Save(user)
}
