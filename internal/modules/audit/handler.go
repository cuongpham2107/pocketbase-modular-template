package audit

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/platform/config"
	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

type handler struct {
	svc service
}

func (h handler) filters(e *core.RequestEvent) error {
	cfg := config.Get().Audit
	return httpx.OK(e, 200, map[string]any{
		"actions":   cfg.Actions,
		"resources": cfg.Resources,
	})
}

func (h handler) list(e *core.RequestEvent) error {
	p := httpx.ParsePage(e, config.Get().Pagination.DefaultLimit)
	q := e.Request.URL.Query()
	items, total, err := h.svc.List(Filter{
		Query:    q.Get("q"),
		Status:   q.Get("status"),
		Action:   q.Get("action"),
		Resource: q.Get("resource"),
		Limit:    p.Limit,
		Offset:   p.Offset,
	})
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải nhật ký")
	}
	return httpx.Paged(e, items, p, total)
}
