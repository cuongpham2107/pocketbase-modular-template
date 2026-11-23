package settings

import (
	"errors"
	"net/http"
	"strings"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tests"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/filesystem"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
	_ "cuongpham2107/pocketbase-custom/migrations"
)

func newTestApp(t *testing.T) (*tests.TestApp, string, string) {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)

	_, catalog := rbac.NewModule([]module.Module{Module})
	if err := rbac.Sync(app, catalog); err != nil {
		t.Fatal(err)
	}
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		Module.Routes(se.Router.Group("/api/v1"), se.App)
		return se.Next()
	})

	createUser := func(email, role string) string {
		col, _ := app.FindCollectionByNameOrId("users")
		u := core.NewRecord(col)
		u.Set("email", email)
		u.SetPassword("password12345")
		if err := app.Save(u); err != nil {
			t.Fatal(err)
		}
		if err := rbac.AssignRolesToUser(app, u.Id, []string{role}); err != nil {
			t.Fatal(err)
		}
		tok, err := u.NewAuthToken()
		if err != nil {
			t.Fatal(err)
		}
		return tok
	}

	return app, createUser("admin@example.com", rbac.RoleAdmin), createUser("user@example.com", rbac.RoleUser)
}

func TestSingletonServiceGetUpdateAndFiles(t *testing.T) {
	app, _, _ := newTestApp(t)
	svc := service{app: app}

	first, err := svc.Get()
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Get()
	if err != nil {
		t.Fatal(err)
	}
	if first.ID != second.ID {
		t.Fatalf("expected singleton ID %q == %q", first.ID, second.ID)
	}
	if count, err := app.CountRecords(collectionName); err != nil || count != 1 {
		t.Fatalf("settings count = %d (err=%v), want 1", count, err)
	}

	badTheme := "{bad-json"
	if _, err := svc.Update(UpdateInput{ThemeSettings: &badTheme}); !errors.Is(err, ErrInvalidThemeSettings) {
		t.Fatalf("got %v, want ErrInvalidThemeSettings", err)
	}

	logoFile, err := filesystem.NewFileFromBytes([]byte(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`), "logo.svg")
	if err != nil {
		t.Fatal(err)
	}
	title := "Acme Portal"
	desc := "Internal operations console"
	theme := `{"mode":"dark","palette":"teal"}`

	updated, err := svc.Update(UpdateInput{
		SiteTitle:       &title,
		SiteDescription: &desc,
		ThemeSettings:   &theme,
		Logo:            logoFile,
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.ID != first.ID || updated.SiteTitle != title || updated.SiteDescription != desc {
		t.Fatalf("unexpected updated dto: %+v", updated)
	}
	if updated.Logo == "" || !strings.HasPrefix(updated.LogoURL, "/api/files/") {
		t.Fatalf("expected uploaded logo URL, got %+v", updated)
	}
	if updated.ThemeSettings != theme {
		t.Fatalf("ThemeSettings = %q, want %q", updated.ThemeSettings, theme)
	}

	cleared, err := svc.Update(UpdateInput{RemoveLogo: true})
	if err != nil {
		t.Fatal(err)
	}
	if cleared.Logo != "" || cleared.LogoURL != "" {
		t.Fatalf("expected logo cleared, got %+v", cleared)
	}
	if count, _ := app.CountRecords(collectionName); count != 1 {
		t.Fatalf("settings count after updates = %d, want 1", count)
	}
}

func TestSettingsRoutesPermissions(t *testing.T) {
	app, adminTok, userTok := newTestApp(t)
	factory := func(testing.TB) *tests.TestApp { return app }

	scenarios := []tests.ApiScenario{
		{
			Name:            "public settings endpoint requires no auth",
			Method:          http.MethodGet,
			URL:             "/api/v1/settings/public",
			ExpectedStatus:  200,
			ExpectedContent: []string{`"site_title":"My App Go"`},
		},
		{
			Name:            "basic user cannot view admin settings",
			Method:          http.MethodGet,
			URL:             "/api/v1/settings",
			Headers:         map[string]string{"Authorization": userTok},
			ExpectedStatus:  403,
			ExpectedContent: []string{`"FORBIDDEN"`},
		},
		{
			Name:            "basic user cannot update settings",
			Method:          http.MethodPut,
			URL:             "/api/v1/settings",
			Body:            strings.NewReader(`{"site_title":"Hacked"}`),
			Headers:         map[string]string{"Authorization": userTok},
			ExpectedStatus:  403,
			ExpectedContent: []string{`"FORBIDDEN"`},
		},
		{
			Name:            "admin can update settings and public endpoint reflects changes",
			Method:          http.MethodPut,
			URL:             "/api/v1/settings",
			Body:            strings.NewReader(`{"site_title":"Studio Corp","site_description":"Portal v2","theme_settings":"{\"mode\":\"dark\"}"}`),
			Headers:         map[string]string{"Authorization": adminTok},
			ExpectedStatus:  200,
			ExpectedContent: []string{`"site_title":"Studio Corp"`, `"site_description":"Portal v2"`},
		},
		{
			Name:            "public endpoint reflects updated title and theme",
			Method:          http.MethodGet,
			URL:             "/api/v1/settings/public",
			ExpectedStatus:  200,
			ExpectedContent: []string{`"site_title":"Studio Corp"`, `"theme_settings":"{\"mode\":\"dark\"}"`},
		},
	}

	for _, s := range scenarios {
		s.TestAppFactory = factory
		s.DisableTestAppCleanup = true
		s.Test(t)
	}
}
