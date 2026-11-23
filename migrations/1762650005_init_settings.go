package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		c := findOrNewBase(app, "settings")
		addMissing(c,
			&core.TextField{Name: "key", Required: true, Max: 50},
			&core.TextField{Name: "site_title", Max: 200},
			&core.TextField{Name: "site_description", Max: 1000},
			&core.FileField{
				Name:      "logo",
				MaxSelect: 1,
				MaxSize:   10 << 20,
				MimeTypes: []string{"image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"},
			},
			&core.FileField{
				Name:      "favicon",
				MaxSelect: 1,
				MaxSize:   5 << 20,
				MimeTypes: []string{"image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml", "image/webp"},
			},
			&core.TextField{Name: "theme_settings", Max: 50000},
		)
		addMissing(c, timestamps()...)
		c.AddIndex("idx_settings_key", true, "key", "")

		// Locked on native /api/collections/*; reads/writes go through /api/v1/settings*.
		c.ListRule, c.ViewRule = nil, nil
		c.CreateRule, c.UpdateRule, c.DeleteRule = nil, nil, nil
		if err := app.Save(c); err != nil {
			return err
		}

		if _, err := app.FindFirstRecordByData("settings", "key", "default"); err != nil {
			rec := core.NewRecord(c)
			rec.Set("key", "default")
			rec.Set("site_title", "My App Go")
			rec.Set("site_description", "Universal Go Backend")
			if err := app.Save(rec); err != nil {
				return err
			}
		}
		return nil
	}, func(app core.App) error {
		return deleteIfExists(app, "settings")
	})
}
