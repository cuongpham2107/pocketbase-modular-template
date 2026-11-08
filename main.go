package main

import (
	"log"
	"os"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/hooks"
	"cuongpham2107/pocketbase-custom/internal/jobs"
	"cuongpham2107/pocketbase-custom/internal/rbac"
	"cuongpham2107/pocketbase-custom/internal/routes"
)

func main() {
	app := pocketbase.New()

	hooks.Register(app)
	jobs.Register(app)

	// Khởi tạo và đồng bộ RBAC Collections khi khởi động
	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		if err := rbac.RegisterCollections(e.App); err != nil {
			log.Printf("[RBAC] Register collections error: %v", err)
			return err
		}

		if err := rbac.SyncCatalog(e.App); err != nil {
			log.Printf("[RBAC] Sync catalog error: %v", err)
			return err
		}

		return nil
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// Đăng ký custom REST APIs (/api/custom/...)
		routes.Register(se)

		// Redirect root / sang /admin/
		se.Router.GET("/", func(e *core.RequestEvent) error {
			return e.Redirect(307, "/admin/")
		})

		// Tránh log lỗi 404 cho favicon
		se.Router.GET("/favicon.ico", func(e *core.RequestEvent) error {
			return e.NoContent(204)
		})

		// Phục vụ Admin Portal SPA tại /admin/ (nếu tồn tại)
		if _, err := os.Stat("./pb_public/admin"); err == nil {
			se.Router.GET("/admin", func(e *core.RequestEvent) error {
				return e.Redirect(307, "/admin/")
			})
			se.Router.GET("/admin/{path...}", apis.Static(os.DirFS("./pb_public/admin"), true))
		}

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}