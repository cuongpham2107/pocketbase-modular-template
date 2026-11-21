package rbac

import (
	"slices"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tests"

	"cuongpham2107/pocketbase-custom/internal/platform/module"
	_ "cuongpham2107/pocketbase-custom/migrations"
)

var testFeatures = []module.Module{
	{Name: "orders", Label: "Orders", Permissions: []module.Permission{
		{Code: "orders:view", Label: "View", Basic: true},
		{Code: "orders:confirm", Label: "Confirm"},
	}},
	{Name: "empty"}, // modules without permissions are skipped
}

func newApp(t *testing.T) (*tests.TestApp, []Group) {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)
	_, catalog := NewModule(testFeatures)
	if err := Sync(app, catalog); err != nil {
		t.Fatal(err)
	}
	return app, catalog
}

func newUser(t *testing.T, app core.App, email string, roleNames ...string) *core.Record {
	t.Helper()
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	u := core.NewRecord(col)
	u.Set("email", email)
	u.SetPassword("password12345")
	if err := app.Save(u); err != nil {
		t.Fatal(err)
	}
	if err := AssignRolesToUser(app, u.Id, roleNames); err != nil {
		t.Fatal(err)
	}
	u, _ = app.FindRecordById("users", u.Id)
	return u
}

func rolePerms(t *testing.T, app core.App, name string) []string {
	t.Helper()
	r, err := app.FindFirstRecordByData("roles", "name", name)
	if err != nil {
		t.Fatal(err)
	}
	return formatRoles(app, []*core.Record{r})[0].Permissions
}

func TestBuildCatalogSkipsModulesWithoutPermissions(t *testing.T) {
	_, catalog := NewModule(testFeatures)
	var mods []string
	for _, g := range catalog {
		mods = append(mods, g.Module)
	}
	if !slices.Equal(mods, []string{"orders", "roles"}) {
		t.Fatalf("catalog modules = %v", mods)
	}
	if got := len(flatten(catalog)); got != 2+len(permissions) {
		t.Fatalf("flatten = %d items", got)
	}
}

func TestSyncCreatesRolesAndIsIdempotent(t *testing.T) {
	app, catalog := newApp(t)

	admin := rolePerms(t, app, RoleAdmin)
	if len(admin) != len(flatten(catalog)) {
		t.Fatalf("admin should hold every permission, got %v", admin)
	}
	if user := rolePerms(t, app, RoleUser); !slices.Equal(user, []string{"orders:view"}) {
		t.Fatalf("user role should only hold Basic permissions, got %v", user)
	}

	// Second run must not duplicate permissions.
	if err := Sync(app, catalog); err != nil {
		t.Fatal(err)
	}
	if n, _ := app.CountRecords("permissions"); int(n) != len(flatten(catalog)) {
		t.Fatalf("permissions duplicated: %d", n)
	}
}

func TestSyncKeepsUserRoleCustomisationsButResetsAdmin(t *testing.T) {
	app, catalog := newApp(t)

	if err := AssignPermissionsToRole(app, mustRoleID(t, app, RoleUser), []string{"orders:confirm"}); err != nil {
		t.Fatal(err)
	}
	if err := AssignPermissionsToRole(app, mustRoleID(t, app, RoleAdmin), []string{}); err != nil {
		t.Fatal(err)
	}
	if err := Sync(app, catalog); err != nil {
		t.Fatal(err)
	}

	if user := rolePerms(t, app, RoleUser); !slices.Equal(user, []string{"orders:confirm"}) {
		t.Fatalf("sync must not overwrite an edited user role, got %v", user)
	}
	if admin := rolePerms(t, app, RoleAdmin); len(admin) != len(flatten(catalog)) {
		t.Fatalf("sync must restore full admin permissions, got %v", admin)
	}
}

func TestUserPermissionsUnionAcrossRoles(t *testing.T) {
	app, _ := newApp(t)
	if _, err := CreateRole(app, "confirmer", "", []string{"orders:confirm", "orders:view"}); err != nil {
		t.Fatal(err)
	}
	u := newUser(t, app, "multi@example.com", RoleUser, "confirmer")

	got := UserPermissions(app, u)
	if !slices.Equal(got, []string{"orders:confirm", "orders:view"}) {
		t.Fatalf("expected sorted, de-duplicated union, got %v", got)
	}
	dto := FormatUser(app, u)
	if dto.Role != RoleUser || len(dto.Roles) != 2 || dto.Name != "multi" {
		t.Fatalf("unexpected dto %+v", dto)
	}
}

func TestUserWithoutRolesHasNoPermissions(t *testing.T) {
	app, _ := newApp(t)
	u := newUser(t, app, "nobody@example.com")
	if got := UserPermissions(app, u); len(got) != 0 {
		t.Fatalf("expected no permissions, got %v", got)
	}
	if FormatUser(app, u).Role != RoleUser {
		t.Fatal("role should fall back to user for display")
	}
}

func TestAssignRejectsUnknownValues(t *testing.T) {
	app, _ := newApp(t)
	u := newUser(t, app, "x@example.com", RoleUser)

	if err := AssignRolesToUser(app, u.Id, []string{RoleUser, "ghost"}); err == nil {
		t.Fatal("unknown role name must be rejected")
	}
	if err := AssignPermissionsToRole(app, mustRoleID(t, app, RoleUser), []string{"nope:nope"}); err == nil {
		t.Fatal("unknown permission code must be rejected")
	}
	if _, err := CreateRole(app, "bad", "", []string{"nope:nope"}); err == nil {
		t.Fatal("CreateRole must reject unknown codes")
	}
	if _, err := app.FindFirstRecordByData("roles", "name", "bad"); err == nil {
		t.Fatal("failed CreateRole must not leave a role behind")
	}
}

func TestAddUsersToRoleIsAtomic(t *testing.T) {
	app, _ := newApp(t)
	u := newUser(t, app, "a@example.com", RoleUser)
	adminID := mustRoleID(t, app, RoleAdmin)

	if err := AddUsersToRole(app, adminID, []string{u.Id, "missing-user-id"}); err == nil {
		t.Fatal("expected error for unknown user")
	}
	u, _ = app.FindRecordById("users", u.Id)
	if slices.Contains(u.GetStringSlice("roles"), adminID) {
		t.Fatal("partial update leaked: transaction must roll back")
	}

	if err := AddUsersToRole(app, adminID, []string{u.Id, u.Id}); err != nil {
		t.Fatal(err)
	}
	u, _ = app.FindRecordById("users", u.Id)
	if n := len(u.GetStringSlice("roles")); n != 2 {
		t.Fatalf("expected user+admin without duplicates, got %d roles", n)
	}
}

func TestCoverageReportsUnassignedAndDeprecated(t *testing.T) {
	app, catalog := newApp(t)
	if err := AssignPermissionsToRole(app, mustRoleID(t, app, RoleAdmin), []string{"orders:view"}); err != nil {
		t.Fatal(err)
	}

	// A permission that exists in the DB but was removed from code.
	col, _ := app.FindCollectionByNameOrId("permissions")
	old := core.NewRecord(col)
	old.Set("code", "legacy:thing")
	old.Set("module", "legacy")
	if err := app.Save(old); err != nil {
		t.Fatal(err)
	}
	if err := AssignPermissionsToRole(app, mustRoleID(t, app, RoleUser), []string{"legacy:thing"}); err != nil {
		t.Fatal(err)
	}

	cov, err := Coverage(app, catalog)
	if err != nil {
		t.Fatal(err)
	}
	if slices.Contains(cov.UnassignedCodes, "orders:view") || !slices.Contains(cov.UnassignedCodes, "orders:confirm") {
		t.Fatalf("unassigned = %v", cov.UnassignedCodes)
	}
	if !slices.Equal(cov.DeprecatedAssigned, []string{"legacy:thing"}) {
		t.Fatalf("deprecated = %v", cov.DeprecatedAssigned)
	}
}

func mustRoleID(t *testing.T, app core.App, name string) string {
	t.Helper()
	r, err := app.FindFirstRecordByData("roles", "name", name)
	if err != nil {
		t.Fatal(err)
	}
	return r.Id
}
