package routes

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/services"
)

func Register(se *core.ServeEvent) {
	// Đăng ký REST API v1 cho frontend (auth, rbac, users, modules)
	RegisterV1(se)

	orders := services.NewOrderService(se.App)

	g := se.Router.Group("/api/custom")
	g.Bind(apis.RequireAuth()) // Bắt buộc đăng nhập token (User hoặc Superuser)

	// POST /api/custom/orders/create (Custom Action tạo đơn hàng với transaction)
	g.POST("/orders/create", func(e *core.RequestEvent) error {
		var req services.CreateOrderDTO
		if err := e.BindBody(&req); err != nil {
			return e.BadRequestError("Dữ liệu gửi lên không hợp lệ", err)
		}

		order, err := orders.CreateOrder(e.Auth, req)
		if err != nil {
			return e.BadRequestError(err.Error(), err)
		}

		return e.JSON(200, map[string]any{
			"success": true,
			"order":   order,
		})
	})

	// POST /api/custom/orders/{id}/confirm (Custom Action xác nhận đơn)
	g.POST("/orders/{id}/confirm", func(e *core.RequestEvent) error {
		if err := orders.Confirm(e.Request.PathValue("id")); err != nil {
			return e.BadRequestError("Không xác nhận được đơn hàng", err)
		}
		return e.JSON(200, map[string]string{"status": "ok"})
	})
}
