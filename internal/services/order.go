package services

import (
	"fmt"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

type OrderService struct {
	app core.App
}

func NewOrderService(app core.App) *OrderService {
	return &OrderService{app: app}
}

type CreateOrderDTO struct {
	CustomerName    string  `json:"customerName"`
	Total           float64 `json:"total"`
	ShippingAddress string  `json:"shippingAddress"`
	Notes           string  `json:"notes"`
}

// CreateOrder là custom action tạo đơn hàng với Transaction an toàn
func (s *OrderService) CreateOrder(user *core.Record, dto CreateOrderDTO) (*core.Record, error) {
	if dto.CustomerName == "" {
		return nil, fmt.Errorf("tên khách hàng không được để trống")
	}

	var newOrder *core.Record

	err := s.app.RunInTransaction(func(txApp core.App) error {
		col, err := txApp.FindCollectionByNameOrId("orders")
		if err != nil {
			return fmt.Errorf("bảng orders chưa được tạo: %w", err)
		}

		newOrder = core.NewRecord(col)
		newOrder.Set("code", fmt.Sprintf("ORD-%s-%04d", time.Now().Format("20060102"), time.Now().Unix()%10000))
		newOrder.Set("customer", dto.CustomerName)
		newOrder.Set("total", dto.Total)
		newOrder.Set("status", "pending")
		newOrder.Set("shippingAddress", dto.ShippingAddress)
		newOrder.Set("notes", dto.Notes)

		if user != nil {
			newOrder.Set("user", user.Id)
		}

		return txApp.Save(newOrder)
	})

	return newOrder, err
}

func (s *OrderService) Confirm(orderID string) error {
	order, err := s.app.FindRecordById("orders", orderID)
	if err != nil {
		return err
	}
	order.Set("status", "confirmed")
	return s.app.Save(order)
}
