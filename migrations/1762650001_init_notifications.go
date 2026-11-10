package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		c := findOrNewBase(app, "notifications")
		addMissing(c,
			&core.TextField{Name: "user_id"}, // empty = broadcast to everyone
			&core.TextField{Name: "type"},
			&core.TextField{Name: "title", Required: true},
			&core.TextField{Name: "body"},
			&core.TextField{Name: "data"},
			&core.TextField{Name: "read_at"},
		)
		addMissing(c, timestamps()...)
		c.AddIndex("idx_notifications_user_id", false, "user_id", "")

		ownOrBroadcast := types.Pointer("user_id = '' || user_id = @request.auth.id")
		c.ListRule, c.ViewRule = ownOrBroadcast, ownOrBroadcast
		c.CreateRule, c.UpdateRule, c.DeleteRule = nil, nil, nil
		return app.Save(c)
	}, func(app core.App) error {
		return deleteIfExists(app, "notifications")
	})
}
