package services

import "ganigeorgiev.com/pocketbase/pocketbase/core"

type OrderService struct {
    app core.App
}

func NewOrderService(app core.App) *OrderService {
    return &OrderService{app: app}
}

func (s *OrderService) Confirm(orderID string) error {
    order, err := s.app.FindRecordById("orders", orderID)
    if err != nil {
        return err
    }
    order.Set("status", "confirmed")
    return s.app.Save(order)
}