package main

import (
	"log"
	"os"
	"slices"

	"ganigeorgiev.com/pocketbase/pocketbase"
	"ganigeorgiev.com/pocketbase/pocketbase/plugins/migratecmd"

	"cuongpham2107/pocketbase-custom/internal/app"
	_ "cuongpham2107/pocketbase-custom/migrations"
)

func main() {
	pb := pocketbase.New()

	// With --dev, schema edits made in the Studio (/_/) are written to ./migrations automatically.
	migratecmd.MustRegister(pb, pb.RootCmd, migratecmd.Config{
		Automigrate: slices.Contains(os.Args[1:], "--dev"),
	})

	app.Register(pb)

	if err := pb.Start(); err != nil {
		log.Fatal(err)
	}
}
