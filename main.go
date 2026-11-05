package main

import (
	"log"
	"os"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/ui"

	"cuongpham2107/pocketbase-custom/internal/hooks"
	"cuongpham2107/pocketbase-custom/internal/jobs"
	"cuongpham2107/pocketbase-custom/internal/routes"
)

func main() {
	// Trỏ PocketBase Admin Dashboard sang giao diện đã custom
	ui.DistDirFS = os.DirFS("./custom-admin-ui/dist")

	app := pocketbase.New()

    hooks.Register(app)
    jobs.Register(app)

    app.OnServe().BindFunc(func(se *core.ServeEvent) error {
        routes.Register(se)
        return se.Next()
    })

    if err := app.Start(); err != nil {
        log.Fatal(err)
    }
}