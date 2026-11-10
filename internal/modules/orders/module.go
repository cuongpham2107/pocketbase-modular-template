// Package orders is the reference business module. Copy this folder to start a new feature:
//
//	module.go   – permissions + routes + Init (event hooks / cron jobs)
//	handler.go  – HTTP only: bind → service → httpx
//	service.go  – business rules, transactions; no HTTP types
//	*_test.go   – service tests against tests.NewTestApp
package orders

import (
	"fmt"

	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermView    = "orders:view"
	PermCreate  = "orders:create"
	PermConfirm = "orders:confirm"
)

var Module = module.Module{
	Name:  "orders",
	Label: "Đơn Hàng",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem đơn hàng", Description: "Xem danh sách và chi tiết đơn hàng"},
		{Code: PermCreate, Label: "Tạo đơn hàng", Description: "Tạo đơn hàng mới"},
		{Code: PermConfirm, Label: "Xác nhận đơn hàng", Description: "Duyệt đơn hàng đang chờ"},
	},
	Init:   initHooks,
	Routes: routes,
}

// initHooks demonstrates PocketBase record lifecycle hooks decoupled from the HTTP/service layer.
// Writing to "notifications" here automatically triggers the notifications module's WebSocket hook.
func initHooks(app core.App) {
	app.OnRecordAfterCreateSuccess("orders").BindFunc(func(e *core.RecordEvent) error {
		emitOrderNotification(e.App, e.Record.GetString("user"), "info",
			fmt.Sprintf("Đơn hàng mới %s", e.Record.GetString("code")),
			fmt.Sprintf("Đơn hàng của khách %s đã được khởi tạo.", e.Record.GetString("customer")),
		)
		return e.Next()
	})

	app.OnRecordAfterUpdateSuccess("orders").BindFunc(func(e *core.RecordEvent) error {
		if e.Record.GetString("status") == StatusConfirmed {
			emitOrderNotification(e.App, e.Record.GetString("user"), "system",
				fmt.Sprintf("Đơn hàng %s đã xác nhận", e.Record.GetString("code")),
				fmt.Sprintf("Đơn hàng của khách %s đã được duyệt thành công.", e.Record.GetString("customer")),
			)
		}
		return e.Next()
	})
}

func emitOrderNotification(app core.App, userID, typ, title, body string) {
	col, err := app.FindCollectionByNameOrId("notifications")
	if err != nil {
		return
	}
	n := core.NewRecord(col)
	n.Set("user_id", userID)
	n.Set("type", typ)
	n.Set("title", title)
	n.Set("body", body)
	_ = app.Save(n)
}

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}
	g := api.Group("/orders").Bind(apis.RequireAuth())
	g.GET("", h.list).Bind(rbac.Require(PermView))
	g.POST("", h.create).Bind(rbac.Require(PermCreate))
	g.POST("/{id}/confirm", h.confirm).Bind(rbac.Require(PermConfirm))
}
