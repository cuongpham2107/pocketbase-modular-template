// Package media provides folder tree management and file storage backed by PocketBase's filesystem.
package media

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/router"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
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

func routes(api *router.RouterGroup[*core.RequestEvent], app core.App) {
	h := handler{svc: service{app: app}}
	g := api.Group("/files").Bind(apis.RequireAuth())

	// Files CRUD & operations
	g.GET("", h.listFiles).Bind(rbac.Require(PermView))
	g.POST("/upload", h.uploadFile).Bind(rbac.Require(PermUpload))
	g.POST("/move", h.moveFiles).Bind(rbac.Require(PermUpload))
	g.PATCH("/{id}", h.renameFile).Bind(rbac.Require(PermUpload))
	g.POST("/{id}/copy", h.copyFile).Bind(rbac.Require(PermUpload))
	g.DELETE("/{id}", h.deleteFile).Bind(rbac.Require(PermDelete))

	// Folder Tree CRUD
	g.GET("/folders/tree", h.folderTree).Bind(rbac.Require(PermView))
	g.POST("/folders", h.createFolder).Bind(rbac.Require(PermUpload))
	g.PUT("/folders/{id}", h.updateFolder).Bind(rbac.Require(PermUpload))
	g.DELETE("/folders/{id}", h.deleteFolder).Bind(rbac.Require(PermDelete))
}
