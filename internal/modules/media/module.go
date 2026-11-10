// Package media declares media permissions and the file-manager endpoints the frontend calls.
package media

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
	"cuongpham2107/pocketbase-custom/internal/platform/module"
)

const (
	PermView   = "media:view"
	PermUpload = "media:upload"
	PermDelete = "media:delete"
)

var Module = module.Module{
	Name:  "media",
	Label: "Đa Phương Tiện & File",
	Permissions: []module.Permission{
		{Code: PermView, Label: "Xem media", Description: "Xem danh sách tập tin tải lên", Basic: true},
		{Code: PermUpload, Label: "Tải lên media", Description: "Tải file mới lên hệ thống"},
		{Code: PermDelete, Label: "Xoá media", Description: "Xoá tập tin khỏi kho lưu trữ"},
	},
	Routes: routes,
}

// ponytail: stubs returning empty lists; back them with a "files" collection when the media feature is built.
func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	empty := func(e *core.RequestEvent) error { return httpx.OK(e, 200, []any{}) }
	g := api.Group("/files").Bind(apis.RequireAuth(), rbac.Require(PermView))
	g.GET("", empty)
	g.GET("/folders/tree", empty)
}
