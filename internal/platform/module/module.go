// Package module defines the contract every business module implements.
// Adding a feature = one folder under internal/modules + one line in internal/app.
package module

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"
)

// Permission is a permission code declared by a module.
// rbac.Sync upserts every declared permission into the "permissions" collection on startup.
type Permission struct {
	Code        string
	Label       string
	Description string
	// Basic marks the permission as granted to the default "user" role when that role is first created.
	Basic bool
}

// Module bundles everything a feature contributes to the app.
type Module struct {
	Name        string
	Label       string
	Permissions []Permission

	// Init binds hooks and cron jobs. Optional.
	Init func(app core.App)

	// Routes mounts HTTP handlers on the /api/v1 group. Optional.
	Routes func(api *router.RouterGroup[*core.RequestEvent], app core.App)
}
