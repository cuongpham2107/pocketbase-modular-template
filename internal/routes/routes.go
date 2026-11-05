package routes

import (
	"ganigeorgiev.com/pocketbase/pocketbase/apis"
	"ganigeorgiev.com/pocketbase/pocketbase/core"

	"cuongpham2107/pocketbase-custom/internal/services"
)

func Register(se *core.ServeEvent) {
    orders := services.NewOrderService(se.App)

    g := se.Router.Group("/api/custom")
    g.Bind(apis.RequireAuth()) // bắt buộc đăng nhập

    g.POST("/orders/{id}/confirm", func(e *core.RequestEvent) error {
        if err := orders.Confirm(e.Request.PathValue("id")); err != nil {
            return e.BadRequestError("Không xác nhận được đơn hàng", err)
        }
        return e.JSON(200, map[string]string{"status": "ok"})
    })
}