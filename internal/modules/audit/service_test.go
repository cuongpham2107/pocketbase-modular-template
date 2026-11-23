package audit

import (
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tests"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/security"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"

	_ "cuongpham2107/pocketbase-custom/migrations"
)

func TestParseResource(t *testing.T) {
	cases := []struct {
		url      string
		wantRes  string
		wantID   string
	}{
		{"/api/v1/users/abc?page=1", "users", "abc"},
		{"/api/collections/media_files/records/file123", "media_files", "file123"},
		{"/api/v1/audit-logs", "audit-logs", ""},
		{"/", "system", ""},
	}
	for _, c := range cases {
		res, id := parseResource(c.url)
		if res != c.wantRes || id != c.wantID {
			t.Fatalf("parseResource(%q) = (%q, %q), want (%q, %q)", c.url, res, id, c.wantRes, c.wantID)
		}
	}
}

func TestListFiltersAndHidesNoisyPaths(t *testing.T) {
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)

	saveLog := func(method, url string, status int) {
		t.Helper()
		l := &core.Log{
			Message: method + " " + url,
			Data: types.JSONMap[any]{
				"type":   "request",
				"method": method,
				"url":    url,
				"status": float64(status),
			},
		}
		l.Id = security.RandomString(15)
		l.MarkAsNew()
		if err := app.AuxSave(l); err != nil {
			t.Fatal(err)
		}
	}

	saveLog("GET", "/api/v1/users", 200)
	saveLog("POST", "/api/v1/notifications", 400)
	saveLog("GET", "/health", 200)

	svc := service{app: app}

	items, total, err := svc.List(Filter{Limit: 20})
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 || len(items) != 2 {
		t.Fatalf("got total=%d len=%d, want 2 (hidden /health excluded)", total, len(items))
	}

	items, total, err = svc.List(Filter{Status: "failure", Action: "POST", Limit: 20})
	if err != nil {
		t.Fatal(err)
	}
	if total != 1 || items[0].Resource != "notifications" || items[0].Status != "failure" {
		t.Fatalf("unexpected filtered items: total=%d items=%+v", total, items)
	}
}
