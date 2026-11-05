package hooks

import (
	"log"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func Register(app core.App) {
	// Tự động kiểm tra và khởi tạo schema collection orders nếu chưa có
	app.OnBootstrap().BindFunc(func(e *core.BootstrapEvent) error {
		if err := e.Next(); err != nil {
			return err
		}

		if err := ensureOrdersCollection(e.App); err != nil {
			log.Printf("[hooks] Cảnh báo tạo bảng orders: %v", err)
		}

		return nil
	})
}

func ensureOrdersCollection(app core.App) error {
	_, err := app.FindCollectionByNameOrId("orders")
	if err == nil {
		return nil // Đã tồn tại
	}

	orders := core.NewBaseCollection("orders")
	orders.Fields.Add(
		&core.TextField{Name: "code"},
		&core.TextField{Name: "customer", Required: true},
		&core.NumberField{Name: "total"},
		&core.TextField{Name: "status"},
		&core.TextField{Name: "shippingAddress"},
		&core.TextField{Name: "notes"},
	)

	// Cấp quyền truy cập cho user đã đăng nhập hoặc superuser
	authRule := "@request.auth.id != ''"
	orders.ListRule = types.Pointer(authRule)
	orders.ViewRule = types.Pointer(authRule)
	orders.CreateRule = types.Pointer(authRule)
	orders.UpdateRule = types.Pointer(authRule)
	orders.DeleteRule = types.Pointer(authRule)

	return app.Save(orders)
}
