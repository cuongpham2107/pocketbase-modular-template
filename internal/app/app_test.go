package app

import (
	"net/http"
	"strings"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tests"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	_ "cuongpham2107/pocketbase-custom/migrations"
)

type fixture struct {
	app                   *tests.TestApp
	adminToken, userToken string
	userID                string
}

func setup(t *testing.T) fixture {
	t.Helper()
	ta, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(ta.Cleanup)

	Register(ta)
	_, catalog := rbac.NewModule(features)
	if err := rbac.Sync(ta, catalog); err != nil {
		t.Fatal(err)
	}

	admin := newUser(t, ta, "rbac-admin@example.com", rbac.RoleAdmin)
	user := newUser(t, ta, "rbac-user@example.com", rbac.RoleUser)
	return fixture{app: ta, adminToken: token(t, admin), userToken: token(t, user), userID: user.Id}
}

func newUser(t *testing.T, app core.App, email, role string) *core.Record {
	t.Helper()
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	r, err := app.FindFirstRecordByData("roles", "name", role)
	if err != nil {
		t.Fatal(err)
	}
	u := core.NewRecord(col)
	u.Set("email", email)
	u.Set("roles", []string{r.Id})
	u.SetPassword("password12345")
	if err := app.Save(u); err != nil {
		t.Fatal(err)
	}
	return u
}

func token(t *testing.T, u *core.Record) string {
	t.Helper()
	tok, err := u.NewAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

func TestPermissionEnforcement(t *testing.T) {
	f := setup(t)
	factory := func(testing.TB) *tests.TestApp { return f.app }

	scenarios := []tests.ApiScenario{
		{
			Name:            "anonymous cannot list users",
			Method:          http.MethodGet,
			URL:             "/api/v1/users",
			ExpectedStatus:  401,
			ExpectedContent: []string{`"status":401`},
		},
		{
			Name:            "basic user can list users (users:view)",
			Method:          http.MethodGet,
			URL:             "/api/v1/users",
			Headers:         map[string]string{"Authorization": f.userToken},
			ExpectedStatus:  200,
			ExpectedContent: []string{`"success":true`, `"pagination"`},
		},
		{
			Name:            "basic user cannot make themselves admin",
			Method:          http.MethodPost,
			URL:             "/api/v1/users/" + f.userID + "/roles",
			Body:            strings.NewReader(`{"role_names":["admin"]}`),
			Headers:         map[string]string{"Authorization": f.userToken},
			ExpectedStatus:  403,
			ExpectedContent: []string{`"FORBIDDEN"`},
		},
		{
			Name:            "basic user cannot change a role via profile update",
			Method:          http.MethodPut,
			URL:             "/api/v1/users/" + f.userID,
			Body:            strings.NewReader(`{"role":"admin"}`),
			Headers:         map[string]string{"Authorization": f.userToken},
			ExpectedStatus:  403,
			ExpectedContent: []string{`"FORBIDDEN"`},
		},
		{
			Name:            "basic user cannot escalate through the native records API",
			Method:          http.MethodPatch,
			URL:             "/api/collections/users/records/" + f.userID,
			Body:            strings.NewReader(`{"roles":[]}`),
			Headers:         map[string]string{"Authorization": f.userToken},
			ExpectedStatus:  404, // update rule rejects → PocketBase reports not found
			ExpectedContent: []string{`"status":404`},
		},
		{
			Name:            "admin can assign roles",
			Method:          http.MethodPost,
			URL:             "/api/v1/users/" + f.userID + "/roles",
			Body:            strings.NewReader(`{"role_names":["user"]}`),
			Headers:         map[string]string{"Authorization": f.adminToken},
			ExpectedStatus:  200,
			ExpectedContent: []string{`"success":true`},
		},
		{
			Name:            "unknown role name is rejected, not silently dropped",
			Method:          http.MethodPost,
			URL:             "/api/v1/users/" + f.userID + "/roles",
			Body:            strings.NewReader(`{"role_names":["nope"]}`),
			Headers:         map[string]string{"Authorization": f.adminToken},
			ExpectedStatus:  400,
			ExpectedContent: []string{`nope`},
		},
		{
			Name:            "basic user cannot read audit logs",
			Method:          http.MethodGet,
			URL:             "/api/v1/audit-logs",
			Headers:         map[string]string{"Authorization": f.userToken},
			ExpectedStatus:  403,
			ExpectedContent: []string{`"FORBIDDEN"`},
		},
		{
			Name:            "catalog contains permissions declared by every module",
			Method:          http.MethodGet,
			URL:             "/api/v1/permissions/catalog",
			Headers:         map[string]string{"Authorization": f.adminToken},
			ExpectedStatus:  200,
			ExpectedContent: []string{`"users:view"`, `"roles:manage"`, `"orders:confirm"`, `"media:upload"`},
		},
	}

	for _, s := range scenarios {
		s.TestAppFactory = factory
		s.DisableTestAppCleanup = true
		s.Test(t)
	}
}
