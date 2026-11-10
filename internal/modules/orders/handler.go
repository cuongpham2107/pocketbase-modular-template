package orders

import (
	"errors"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

type handler struct {
	svc service
}

func (h handler) list(e *core.RequestEvent) error {
	p := httpx.ParsePage(e, 20)
	recs, total, err := h.svc.List(p.Limit, p.Offset)
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải đơn hàng")
	}
	return httpx.Paged(e, recs, p, total)
}

func (h handler) create(e *core.RequestEvent) error {
	var in CreateInput
	if err := e.BindBody(&in); err != nil {
		return httpx.BadRequest(e)
	}
	userID := ""
	if !e.HasSuperuserAuth() {
		userID = e.Auth.Id
	}
	rec, err := h.svc.Create(userID, in)
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", err.Error())
	}
	return httpx.OK(e, 201, rec)
}

func (h handler) confirm(e *core.RequestEvent) error {
	rec, err := h.svc.Confirm(e.Request.PathValue("id"))
	switch {
	case errors.Is(err, ErrNotFound):
		return httpx.Fail(e, 404, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrNotPending):
		return httpx.Fail(e, 409, "CONFLICT", err.Error())
	case err != nil:
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không xác nhận được đơn hàng")
	}
	return httpx.OK(e, 200, rec)
}
