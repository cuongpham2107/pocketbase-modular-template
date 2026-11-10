// Package httpx holds the shared JSON envelope and request helpers used by all modules.
package httpx

import (
	"math"
	"strconv"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

const maxPageSize = 100

// OK writes {"success": true, "data": data}.
func OK(e *core.RequestEvent, status int, data any) error {
	return e.JSON(status, map[string]any{"success": true, "data": data})
}

// Message writes {"success": true, "message": msg}.
func Message(e *core.RequestEvent, msg string) error {
	return e.JSON(200, map[string]any{"success": true, "message": msg})
}

// Fail writes {"success": false, "error": {"code": code, "message": msg}}.
func Fail(e *core.RequestEvent, status int, code, msg string) error {
	return e.JSON(status, map[string]any{
		"success": false,
		"error":   map[string]any{"code": code, "message": msg},
	})
}

// BadRequest is the common "invalid body" failure.
func BadRequest(e *core.RequestEvent) error {
	return Fail(e, 400, "BAD_REQUEST", "Dữ liệu không hợp lệ")
}

// Page is a parsed pagination request.
type Page struct {
	Page   int
	Limit  int
	Offset int
}

// ParsePage reads ?page and ?per_page (or ?limit), capped at maxPageSize.
func ParsePage(e *core.RequestEvent, defaultLimit int) Page {
	q := e.Request.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("per_page"))
	if limit < 1 {
		limit, _ = strconv.Atoi(q.Get("limit"))
	}
	if limit < 1 {
		limit = defaultLimit
	}
	limit = min(limit, maxPageSize)
	return Page{Page: page, Limit: limit, Offset: (page - 1) * limit}
}

// Paged writes a list response with the pagination block the frontend expects.
func Paged(e *core.RequestEvent, data any, p Page, total int64) error {
	totalPages := max(int(math.Ceil(float64(total)/float64(p.Limit))), 1)
	return e.JSON(200, map[string]any{
		"success": true,
		"data":    data,
		"pagination": map[string]any{
			"page":        p.Page,
			"limit":       p.Limit,
			"total_items": total,
			"total_pages": totalPages,
		},
	})
}
