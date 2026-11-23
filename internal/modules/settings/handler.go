package settings

import (
	"errors"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/platform/httpx"
)

type handler struct {
	svc service
}

func (h handler) public(e *core.RequestEvent) error {
	dto, err := h.svc.Get()
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải cài đặt hệ thống")
	}
	return httpx.OK(e, 200, dto)
}

func (h handler) get(e *core.RequestEvent) error {
	dto, err := h.svc.Get()
	if err != nil {
		return httpx.Fail(e, 500, "INTERNAL_ERROR", "Không thể tải cài đặt hệ thống")
	}
	return httpx.OK(e, 200, dto)
}

func (h handler) update(e *core.RequestEvent) error {
	var in UpdateInput

	ct := strings.ToLower(e.Request.Header.Get("Content-Type"))
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := e.Request.ParseMultipartForm(16 << 20); err != nil {
			return httpx.BadRequest(e)
		}
		if vals, ok := e.Request.MultipartForm.Value["site_title"]; ok && len(vals) > 0 {
			v := vals[0]
			in.SiteTitle = &v
		}
		if vals, ok := e.Request.MultipartForm.Value["site_description"]; ok && len(vals) > 0 {
			v := vals[0]
			in.SiteDescription = &v
		}
		if vals, ok := e.Request.MultipartForm.Value["theme_settings"]; ok && len(vals) > 0 {
			v := vals[0]
			in.ThemeSettings = &v
		}
		in.RemoveLogo = parseBool(e.Request.FormValue("remove_logo"))
		in.RemoveFavicon = parseBool(e.Request.FormValue("remove_favicon"))

		if files, err := e.FindUploadedFiles("logo"); err == nil && len(files) > 0 {
			in.Logo = files[0]
		}
		if files, err := e.FindUploadedFiles("favicon"); err == nil && len(files) > 0 {
			in.Favicon = files[0]
		}
	} else {
		var req struct {
			SiteTitle       *string `json:"site_title"`
			SiteDescription *string `json:"site_description"`
			ThemeSettings   *string `json:"theme_settings"`
			RemoveLogo      bool    `json:"remove_logo"`
			RemoveFavicon   bool    `json:"remove_favicon"`
		}
		if err := e.BindBody(&req); err != nil {
			return httpx.BadRequest(e)
		}
		in.SiteTitle = req.SiteTitle
		in.SiteDescription = req.SiteDescription
		in.ThemeSettings = req.ThemeSettings
		in.RemoveLogo = req.RemoveLogo
		in.RemoveFavicon = req.RemoveFavicon
	}

	dto, err := h.svc.Update(in)
	if errors.Is(err, ErrInvalidThemeSettings) {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", err.Error())
	}
	if err != nil {
		return httpx.Fail(e, 400, "VALIDATION_FAILED", "Không thể cập nhật cài đặt: "+err.Error())
	}
	return httpx.OK(e, 200, dto)
}

func parseBool(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "true", "yes":
		return true
	default:
		return false
	}
}
