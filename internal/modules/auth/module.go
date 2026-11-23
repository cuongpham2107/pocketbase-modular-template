// Package auth handles sign-in, sign-up, token refresh and the current user's own settings.
package auth

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

var Module = module.Module{
	Name:   "auth",
	Routes: routes,
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}
	g := api.Group("/auth")

	g.POST("/login", h.login)
	g.POST("/register", h.register)
	g.POST("/refresh", h.refresh).Bind(apis.RequireAuth())
	g.POST("/logout", h.logout)
	g.POST("/logout-all", h.logoutAll).Bind(apis.RequireAuth())
	g.GET("/me", h.me).Bind(apis.RequireAuth())
	g.PUT("/settings/theme", h.saveTheme).Bind(apis.RequireAuth())
	g.PUT("/password", h.changePassword).Bind(apis.RequireAuth())
}
