package media

import (
	"errors"
	"fmt"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

type handler struct {
	svc service
}

func anyID(v any) string {
	if v == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(v))
}

func (h handler) listFiles(e *core.RequestEvent) error {
	q := e.Request.URL.Query()
	items, err := h.svc.ListFiles(FileFilter{
		FolderID: q.Get("folder_id"),
		Type:     q.Get("type"),
		Search:   q.Get("search"),
	})
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải danh sách tập tin")
	}
	return httpx.OK(e, 200, items)
}

func (h handler) uploadFile(e *core.RequestEvent) error {
	uploaded, err := e.FindUploadedFiles("file")
	if err != nil || len(uploaded) == 0 {
		return httpx.Fail(e, 400, "BAD_REQUEST", "Vui lòng chọn tập tin tải lên")
	}
	folderID := e.Request.FormValue("folder_id")
	userID := ""
	if e.Auth != nil {
		userID = e.Auth.Id
	}
	rec, err := h.svc.Upload(userID, folderID, uploaded[0])
	if err != nil {
		return httpx.Fail(e, 400, "UPLOAD_FAILED", "Tải tập tin thất bại: "+err.Error())
	}
	return httpx.OK(e, 201, toFileDTO(rec))
}

func (h handler) renameFile(e *core.RequestEvent) error {
	var req struct {
		Name string `json:"name"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	rec, err := h.svc.RenameFile(e.Request.PathValue("id"), req.Name)
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", err.Error())
	}
	return httpx.OK(e, 200, toFileDTO(rec))
}

func (h handler) moveFiles(e *core.RequestEvent) error {
	var req struct {
		FileIDs  []any `json:"file_ids"`
		FolderID any   `json:"folder_id"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	ids := make([]string, 0, len(req.FileIDs))
	for _, raw := range req.FileIDs {
		if s := anyID(raw); s != "" {
			ids = append(ids, s)
		}
	}
	err := h.svc.MoveFiles(ids, anyID(req.FolderID))
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "FAILED", err.Error())
	}
	return httpx.Message(e, "Đã di chuyển tập tin")
}

func (h handler) copyFile(e *core.RequestEvent) error {
	var req struct {
		TargetFolderID any `json:"target_folder_id"`
	}
	_ = e.BindBody(&req)
	userID := ""
	if e.Auth != nil {
		userID = e.Auth.Id
	}
	rec, err := h.svc.CopyFile(userID, e.Request.PathValue("id"), anyID(req.TargetFolderID))
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "FAILED", err.Error())
	}
	return httpx.OK(e, 201, toFileDTO(rec))
}

func (h handler) deleteFile(e *core.RequestEvent) error {
	err := h.svc.DeleteFile(e.Request.PathValue("id"))
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể xoá tập tin")
	}
	return httpx.Message(e, "Đã xoá tập tin")
}

func (h handler) folderTree(e *core.RequestEvent) error {
	tree, err := h.svc.FolderTree()
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải cây thư mục")
	}
	return httpx.OK(e, 200, tree)
}

func (h handler) createFolder(e *core.RequestEvent) error {
	var req struct {
		Name     string `json:"name"`
		ParentID any    `json:"parent_id"`
		Color    string `json:"color"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	userID := ""
	if e.Auth != nil {
		userID = e.Auth.Id
	}
	dto, err := h.svc.CreateFolder(userID, req.Name, anyID(req.ParentID), req.Color)
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", err.Error())
	}
	return httpx.OK(e, 201, dto)
}

func (h handler) updateFolder(e *core.RequestEvent) error {
	var req struct {
		Name     string `json:"name"`
		ParentID any    `json:"parent_id"`
		Color    string `json:"color"`
	}
	if err := e.BindBody(&req); err != nil {
		return httpx.BadRequest(e)
	}
	dto, err := h.svc.UpdateFolder(e.Request.PathValue("id"), req.Name, anyID(req.ParentID), req.Color)
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", err.Error())
	}
	return httpx.OK(e, 200, dto)
}

func (h handler) deleteFolder(e *core.RequestEvent) error {
	err := h.svc.DeleteFolder(e.Request.PathValue("id"))
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể xoá thư mục")
	}
	return httpx.Message(e, "Đã xoá thư mục")
}

