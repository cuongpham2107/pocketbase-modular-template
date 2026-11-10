// Package app wires every module into PocketBase.
package app

import (
	"fmt"
	"os"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/dev"
	"cuongpham2107/pocketbase-custom/internal/modules/audit"
	"cuongpham2107/pocketbase-custom/internal/modules/auth"
	"cuongpham2107/pocketbase-custom/internal/modules/media"
	"cuongpham2107/pocketbase-custom/internal/modules/notifications"
	"cuongpham2107/pocketbase-custom/internal/modules/orders"
	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/modules/users"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

// features lists the business modules. Add a new module here.
var features = []module.Module{
	auth.Module,
	users.Module,
	notifications.Module,
	audit.Module,
	media.Module,
	orders.Module,
}

// frontendModules is what GET /api/v1/modules advertises to the admin portal.
var frontendModules = []string{"rbac", "users", "theme", "audit", "notifications", "media"}

const adminDir = "./pb_public/admin"

// Register binds all modules to the app. Migrations must already be registered (blank import in main).
func Register(app core.App) {
	rbacModule, catalog := rbac.NewModule(features)
	mods := append(features, rbacModule)

	if pb, ok := app.(*pocketbase.PocketBase); ok {
		registerCommands(pb, catalog)
	}

	for _, m := range mods {
		if m.Init != nil {
			m.Init(app)
		}
	}

	// OnServe runs after migrations are applied, so the collections exist here.
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := rbac.Sync(se.App, catalog); err != nil {
			return fmt.Errorf("rbac sync: %w", err)
		}
		if se.App.IsDev() {
			if err := dev.Seed(se.App); err != nil {
				return fmt.Errorf("dev seed: %w", err)
			}
		}

		systemRoutes(se)
		api := se.Router.Group("/api/v1")
		for _, m := range mods {
			if m.Routes != nil {
				m.Routes(api, se.App)
			}
		}
		adminSPA(se)
		return se.Next()
	})
}

func systemRoutes(se *core.ServeEvent) {
	se.Router.GET("/health", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{"status": "ok"})
	})
	se.Router.GET("/ready", func(e *core.RequestEvent) error {
		if _, err := e.App.CountRecords("roles"); err != nil {
			return e.JSON(503, map[string]any{"status": "unavailable", "error": err.Error()})
		}
		return e.JSON(200, map[string]any{"status": "ready", "database": "ok"})
	})
	se.Router.GET("/favicon.ico", func(e *core.RequestEvent) error {
		return e.NoContent(204)
	})
	se.Router.GET("/api/v1/modules", func(e *core.RequestEvent) error {
		return e.JSON(200, map[string]any{
			"success": true,
			"data":    map[string]any{"modules": frontendModules},
			"modules": frontendModules,
		})
	})
}

// adminSPA serves the built admin portal at /admin/ with index.html fallback for client routes.
func adminSPA(se *core.ServeEvent) {
	se.Router.GET("/", func(e *core.RequestEvent) error {
		return e.Redirect(307, "/admin/")
	})
	if _, err := os.Stat(adminDir); err != nil {
		se.Router.GET("/admin/{path...}", func(e *core.RequestEvent) error {
			return httpx.Fail(e, 503, "ADMIN_NOT_BUILT", "Admin portal chưa được build (make build-frontend)")
		})
		return
	}
	se.Router.GET("/admin", func(e *core.RequestEvent) error {
		return e.Redirect(307, "/admin/")
	})
	se.Router.GET("/admin/{path...}", apis.Static(os.DirFS(adminDir), true))
}
