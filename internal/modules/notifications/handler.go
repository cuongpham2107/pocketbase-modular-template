package notifications

import (
	"errors"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/modules/rbac"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

type handler struct {
	svc service
}

type item struct {
	ID        string  `json:"id"`
	UserID    string  `json:"user_id"`
	Type      string  `json:"type"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	Data      string  `json:"data"`
	ReadAt    *string `json:"read_at"`
	CreatedAt string  `json:"created_at"`
}

func toItem(r *core.Record) item {
	var readAt *string
	if v := r.GetString("read_at"); v != "" {
		readAt = &v
	}
	return item{
		ID: r.Id, UserID: r.GetString("user_id"), Type: r.GetString("type"), Title: r.GetString("title"),
		Body: r.GetString("body"), Data: r.GetString("data"), ReadAt: readAt, CreatedAt: r.GetString("created"),
	}
}

func (h handler) list(e *core.RequestEvent) error {
	p := httpx.ParsePage(e, 20)
	u := e.Request.URL.Query().Get("unread")
	recs, total, err := h.svc.List(e.Auth.Id, u == "true" || u == "1", p.Limit, p.Offset)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải thông báo")
	}
	items := make([]item, 0, len(recs))
	for _, r := range recs {
		items = append(items, toItem(r))
	}
	return httpx.Paged(e, items, p, total)
}

func (h handler) unreadCount(e *core.RequestEvent) error {
	n, err := h.svc.UnreadCount(e.Auth.Id)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể đếm thông báo")
	}
	return e.JSON(200, map[string]any{"success": true, "data": map[string]any{"unread": n}, "unread": n})
}

func (h handler) readAll(e *core.RequestEvent) error {
	n, err := h.svc.MarkAllRead(e.Auth.Id)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể cập nhật thông báo")
	}
	return e.JSON(200, map[string]any{"success": true, "data": map[string]any{"updated": n}, "updated": n})
}

func (h handler) markRead(e *core.RequestEvent) error {
	return h.respond(e, h.svc.MarkRead(e.Auth.Id, e.Request.PathValue("id")), "Đã đánh dấu đã đọc")
}

func (h handler) delete(e *core.RequestEvent) error {
	err := h.svc.Delete(e.Auth.Id, e.Request.PathValue("id"), rbac.Can(e, PermSend))
	return h.respond(e, err, "Xoá thông báo thành công")
}

func (h handler) respond(e *core.RequestEvent, err error, okMsg string) error {
	if errors.Is(err, ErrNotFound) {
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể cập nhật thông báo")
	}
	return httpx.Message(e, okMsg)
}
