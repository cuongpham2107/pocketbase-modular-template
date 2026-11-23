package settings

import (
	encjson "encoding/json"
	"errors"
	"strings"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/filesystem"
)

const (
	collectionName = "settings"
	singletonKey   = "default"
	defaultTitle   = "My App Go"
	defaultDesc    = "Universal Go Backend"
)

var ErrInvalidThemeSettings = errors.New("Cài đặt giao diện mặc định không đúng định dạng JSON")

// DTO is the singleton system settings payload.
type DTO struct {
	ID              string `json:"id"`
	SiteTitle       string `json:"site_title"`
	SiteDescription string `json:"site_description"`
	Logo            string `json:"logo,omitempty"`
	LogoURL         string `json:"logo_url,omitempty"`
	Favicon         string `json:"favicon,omitempty"`
	FaviconURL      string `json:"favicon_url,omitempty"`
	ThemeSettings   string `json:"theme_settings,omitempty"`
	UpdatedAt       string `json:"updated_at"`
}

// UpdateInput carries partial updates to the singleton settings record.
type UpdateInput struct {
	SiteTitle       *string
	SiteDescription *string
	ThemeSettings   *string
	Logo            *filesystem.File
	Favicon         *filesystem.File
	RemoveLogo      bool
	RemoveFavicon   bool
}

type service struct {
	app core.App
}

func (s service) Get() (*DTO, error) {
	rec, err := s.ensureRecord(s.app)
	if err != nil {
		return nil, err
	}
	return toDTO(rec), nil
}

func (s service) Update(in UpdateInput) (*DTO, error) {
	if in.ThemeSettings != nil {
		trimmed := strings.TrimSpace(*in.ThemeSettings)
		if trimmed != "" && !encjson.Valid([]byte(trimmed)) {
			return nil, ErrInvalidThemeSettings
		}
	}

	var updated *core.Record
	err := s.app.RunInTransaction(func(tx core.App) error {
		rec, err := s.ensureRecord(tx)
		if err != nil {
			return err
		}
		if in.SiteTitle != nil {
			rec.Set("site_title", strings.TrimSpace(*in.SiteTitle))
		}
		if in.SiteDescription != nil {
			rec.Set("site_description", strings.TrimSpace(*in.SiteDescription))
		}
		if in.ThemeSettings != nil {
			rec.Set("theme_settings", strings.TrimSpace(*in.ThemeSettings))
		}
		if in.RemoveLogo {
			rec.Set("logo", "")
		} else if in.Logo != nil {
			rec.Set("logo", in.Logo)
		}
		if in.RemoveFavicon {
			rec.Set("favicon", "")
		} else if in.Favicon != nil {
			rec.Set("favicon", in.Favicon)
		}
		if err := tx.Save(rec); err != nil {
			return err
		}
		updated = rec
		return nil
	})
	if err != nil {
		return nil, err
	}
	return toDTO(updated), nil
}

func (s service) ensureRecord(app core.App) (*core.Record, error) {
	if rec, err := app.FindFirstRecordByData(collectionName, "key", singletonKey); err == nil {
		return rec, nil
	}
	col, err := app.FindCollectionByNameOrId(collectionName)
	if err != nil {
		return nil, err
	}
	rec := core.NewRecord(col)
	rec.Set("key", singletonKey)
	rec.Set("site_title", defaultTitle)
	rec.Set("site_description", defaultDesc)
	if err := app.Save(rec); err != nil {
		// Handle rare concurrent creation on the unique key index.
		if existing, findErr := app.FindFirstRecordByData(collectionName, "key", singletonKey); findErr == nil {
			return existing, nil
		}
		return nil, err
	}
	return rec, nil
}

func toDTO(r *core.Record) *DTO {
	logo := r.GetString("logo")
	favicon := r.GetString("favicon")
	return &DTO{
		ID:              r.Id,
		SiteTitle:       r.GetString("site_title"),
		SiteDescription: r.GetString("site_description"),
		Logo:            logo,
		LogoURL:         fileURL(r, logo),
		Favicon:         favicon,
		FaviconURL:      fileURL(r, favicon),
		ThemeSettings:   r.GetString("theme_settings"),
		UpdatedAt:       r.GetString("updated"),
	}
}

func fileURL(r *core.Record, filename string) string {
	if filename == "" {
		return ""
	}
	return "/api/files/" + r.Collection().Id + "/" + r.Id + "/" + filename
}
