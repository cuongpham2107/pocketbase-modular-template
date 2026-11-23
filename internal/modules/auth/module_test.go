package auth

import (
	"net/http"
	"strings"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tests"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
	_ "cuongpham2107/pocketbase-custom/migrations"
)

const (
	testEmail    = "auth-user@example.com"
	testPassword = "password12345"
)

// newApp builds a test app with the rbac catalog synced and the auth routes mounted.
func newApp(t testing.TB) *tests.TestApp {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	features := []module.Module{Module, {Name: "reports", Permissions: []module.Permission{
		{Code: "reports:view", Basic: true},
		{Code: "reports:export"},
	}}}
	_, catalog := rbac.NewModule(features)
	if err := rbac.Sync(app, catalog); err != nil {
		t.Fatal(err)
	}
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		Module.Routes(se.Router.Group("/api/v1"), se.App)
		return se.Next()
	})

	user := newRecord(t, app, testEmail)
	if err := rbac.AssignRolesToUser(app, user.Id, []string{rbac.RoleUser}); err != nil {
		t.Fatal(err)
	}
	return app
}

func newRecord(t testing.TB, app core.App, email string) *core.Record {
	t.Helper()
	col, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	u := core.NewRecord(col)
	u.Set("email", email)
	u.SetPassword(testPassword)
	if err := app.Save(u); err != nil {
		t.Fatal(err)
	}
	return u
}

func userToken(t testing.TB, app core.App) string {
	t.Helper()
	u, err := app.FindAuthRecordByEmail("users", testEmail)
	if err != nil {
		t.Fatal(err)
	}
	tok, err := u.NewAuthToken()
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

// tokenStillValid reports whether the token authenticates against the current DB state.
func tokenStillValid(app core.App, token string) bool {
	_, err := app.FindAuthRecordByToken(token, core.TokenTypeAuth)
	return err == nil
}

func json(s string) *strings.Reader { return strings.NewReader(s) }

func TestAuthRoutes(t *testing.T) {
	var token string // fresh per scenario, set by the app factory

	scenarios := []tests.ApiScenario{
		{
			Name:               "login rejects a wrong password",
			Method:             http.MethodPost,
			URL:                "/api/v1/auth/login",
			Body:               json(`{"email":"` + testEmail + `","password":"wrong-password"}`),
			ExpectedStatus:     401,
			ExpectedContent:    []string{`"UNAUTHORIZED"`},
			NotExpectedContent: []string{`"token"`},
		},
		{
			Name:            "login rejects an unknown email with the same message",
			Method:          http.MethodPost,
			URL:             "/api/v1/auth/login",
			Body:            json(`{"email":"ghost@example.com","password":"` + testPassword + `"}`),
			ExpectedStatus:  401,
			ExpectedContent: []string{`"UNAUTHORIZED"`},
		},
		{
			Name:               "login succeeds and returns the user's permissions",
			Method:             http.MethodPost,
			URL:                "/api/v1/auth/login",
			Body:               json(`{"email":"  ` + testEmail + ` ","password":"` + testPassword + `"}`),
			ExpectedStatus:     200,
			ExpectedContent:    []string{`"success":true`, `"token":"`, `"reports:view"`, `"role":"user"`},
			NotExpectedContent: []string{`"reports:export"`, `"password"`, `"tokenKey"`},
		},
		{
			Name:               "register assigns the default user role and ignores injected roles",
			Method:             http.MethodPost,
			URL:                "/api/v1/auth/register",
			Body:               json(`{"email":"new@example.com","password":"password12345","full_name":"New","roles":["admin"],"role":"admin"}`),
			ExpectedStatus:     200,
			ExpectedContent:    []string{`"success":true`, `"roles":["user"]`, `"name":"New"`},
			NotExpectedContent: []string{`"roles:manage"`, `"admin"`},
		},
		{
			Name:            "register rejects a duplicate email",
			Method:          http.MethodPost,
			URL:             "/api/v1/auth/register",
			Body:            json(`{"email":"` + testEmail + `","password":"password12345"}`),
			ExpectedStatus:  400,
			ExpectedContent: []string{`"VALIDATION_FAILED"`},
		},
		{
			Name:            "register rejects a short password",
			Method:          http.MethodPost,
			URL:             "/api/v1/auth/register",
			Body:            json(`{"email":"short@example.com","password":"123"}`),
			ExpectedStatus:  400,
			ExpectedContent: []string{`"VALIDATION_FAILED"`},
		},
		{
			Name:            "me requires authentication",
			Method:          http.MethodGet,
			URL:             "/api/v1/auth/me",
			ExpectedStatus:  401,
			ExpectedContent: []string{`"status":401`},
		},
		{
			Name:            "me returns the current user",
			Method:          http.MethodGet,
			URL:             "/api/v1/auth/me",
			ExpectedStatus:  200,
			ExpectedContent: []string{`"email":"` + testEmail + `"`, `"reports:view"`},
		},
		{
			Name:            "theme settings are saved on the caller",
			Method:          http.MethodPut,
			URL:             "/api/v1/auth/settings/theme",
			Body:            json(`{"theme_settings":"{\"mode\":\"dark\"}"}`),
			ExpectedStatus:  200,
			ExpectedContent: []string{`"theme_settings":"{\"mode\":\"dark\"}"`},
			AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				u, err := app.FindAuthRecordByEmail("users", testEmail)
				if err != nil {
					t.Fatal(err)
				}
				if got := u.GetString("theme_settings"); got != `{"mode":"dark"}` {
					t.Fatalf("stored theme_settings = %q, want {\"mode\":\"dark\"}", got)
				}
			},
		},
		{
			Name:            "theme settings reject invalid json",
			Method:          http.MethodPut,
			URL:             "/api/v1/auth/settings/theme",
			Body:            json(`{"theme_settings":"{not-json"}`),
			ExpectedStatus:  400,
			ExpectedContent: []string{`"VALIDATION_FAILED"`},
		},
		{
			Name:            "change password rejects a wrong current password",
			Method:          http.MethodPut,
			URL:             "/api/v1/auth/password",
			Body:            json(`{"current_password":"nope","new_password":"another-pass-123"}`),
			ExpectedStatus:  400,
			ExpectedContent: []string{`"INVALID_PASSWORD"`},
			AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				if !tokenStillValid(app, token) {
					t.Fatal("a failed password change must not revoke the session")
				}
			},
		},
		{
			Name:            "change password succeeds and revokes existing tokens",
			Method:          http.MethodPut,
			URL:             "/api/v1/auth/password",
			Body:            json(`{"current_password":"` + testPassword + `","new_password":"another-pass-123"}`),
			ExpectedStatus:  200,
			ExpectedContent: []string{`"success":true`},
			AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				u, _ := app.FindAuthRecordByEmail("users", testEmail)
				if !u.ValidatePassword("another-pass-123") {
					t.Fatal("new password was not stored")
				}
				if tokenStillValid(app, token) {
					t.Fatal("old token must be invalid after a password change")
				}
			},
		},
		{
			Name:            "logout-all revokes every existing token",
			Method:          http.MethodPost,
			URL:             "/api/v1/auth/logout-all",
			ExpectedStatus:  200,
			ExpectedContent: []string{`"success":true`},
			AfterTestFunc: func(t testing.TB, app *tests.TestApp, _ *http.Response) {
				if tokenStillValid(app, token) {
					t.Fatal("token must be invalid after logout-all")
				}
			},
		},
		{
			Name:            "refresh issues a new token for a signed-in user",
			Method:          http.MethodPost,
			URL:             "/api/v1/auth/refresh",
			ExpectedStatus:  200,
			ExpectedContent: []string{`"token":"`, `"email":"` + testEmail + `"`},
		},
		{
			Name:            "refresh requires authentication",
			Method:          http.MethodPost,
			URL:             "/api/v1/auth/refresh",
			ExpectedStatus:  401,
			ExpectedContent: []string{`"status":401`},
		},
	}

	for _, s := range scenarios {
		// Scenarios hitting authenticated routes send the token; anonymous ones don't.
		needsAuth := !strings.HasSuffix(s.Name, "requires authentication") &&
			!strings.Contains(s.URL, "/login") && !strings.Contains(s.URL, "/register")
		headers := map[string]string{}
		s.Headers = headers
		// The factory runs before the request is built, so the fresh token lands in the shared map.
		s.TestAppFactory = func(t testing.TB) *tests.TestApp {
			app := newApp(t)
			token = userToken(t, app)
			if needsAuth {
				headers["Authorization"] = token
			}
			return app
		}
		s.Test(t)
	}
}
