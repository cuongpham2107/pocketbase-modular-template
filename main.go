package main

import (
	"log"
	"os"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/hooks"
	"cuongpham2107/pocketbase-custom/internal/jobs"
	"cuongpham2107/pocketbase-custom/internal/routes"
)

func main() {
	app := pocketbase.New()

	hooks.Register(app)
	jobs.Register(app)

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// Đăng ký custom REST APIs (/api/custom/...)
		routes.Register(se)

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