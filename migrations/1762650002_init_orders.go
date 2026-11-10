package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		c := findOrNewBase(app, "orders")
		addMissing(c,
			&core.TextField{Name: "code", Required: true},
			&core.TextField{Name: "customer", Required: true},
			&core.NumberField{Name: "total", Min: types.Pointer(0.0)},
			&core.SelectField{Name: "status", MaxSelect: 1, Values: []string{"pending", "confirmed", "cancelled"}},
			&core.TextField{Name: "shippingAddress"},
			&core.TextField{Name: "notes"},
			&core.RelationField{Name: "user", CollectionId: users.Id, MaxSelect: 1},
		)
		addMissing(c, timestamps()...)
		c.AddIndex("idx_orders_code", true, "code", "")

		c.ListRule, c.ViewRule = authOnly, authOnly
		c.CreateRule, c.UpdateRule, c.DeleteRule = nil, nil, nil
		return app.Save(c)
	}, func(app core.App) error {
		return deleteIfExists(app, "orders")
	})
}
