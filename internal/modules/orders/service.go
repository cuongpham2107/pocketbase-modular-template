package orders

import (
	"errors"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/security"
)

const (
	StatusPending   = "pending"
	StatusConfirmed = "confirmed"

	codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I
)

var (
	ErrCustomerRequired = errors.New("tên khách hàng không được để trống")
	ErrNegativeTotal    = errors.New("tổng tiền không được âm")
	ErrNotFound         = errors.New("không tìm thấy đơn hàng")
	ErrNotPending       = errors.New("chỉ xác nhận được đơn đang chờ")
)

// service holds the order business rules.
type service struct {
	app core.App
}

// CreateInput is the create-order payload.
type CreateInput struct {
	CustomerName    string  `json:"customerName"`
	Total           float64 `json:"total"`
	ShippingAddress string  `json:"shippingAddress"`
	Notes           string  `json:"notes"`
}

func (s service) Create(userID string, in CreateInput) (*core.Record, error) {
	customer := strings.TrimSpace(in.CustomerName)
	if customer == "" {
		return nil, ErrCustomerRequired
	}
	if in.Total < 0 {
		return nil, ErrNegativeTotal
	}
	col, err := s.app.FindCollectionByNameOrId("orders")
	if err != nil {
		return nil, err
	}
	rec := core.NewRecord(col)
	rec.Set("code", newCode(time.Now()))
	rec.Set("customer", customer)
	rec.Set("total", in.Total)
	rec.Set("status", StatusPending)
	rec.Set("shippingAddress", strings.TrimSpace(in.ShippingAddress))
	rec.Set("notes", strings.TrimSpace(in.Notes))
	rec.Set("user", userID)
	return rec, s.app.Save(rec)
}

// Confirm moves a pending order to confirmed.
func (s service) Confirm(id string) (*core.Record, error) {
	rec, err := s.app.FindRecordById("orders", id)
	if err != nil {
		return nil, ErrNotFound
	}
	if rec.GetString("status") != StatusPending {
		return nil, ErrNotPending
	}
	rec.Set("status", StatusConfirmed)
	return rec, s.app.Save(rec)
}

func (s service) List(limit, offset int) ([]*core.Record, int64, error) {
	total, err := s.app.CountRecords("orders")
	if err != nil {
		return nil, 0, err
	}
	recs, err := s.app.FindRecordsByFilter("orders", "", "-created", limit, offset)
	return recs, total, err
}

// newCode returns e.g. ORD-20261109-7KX2QM. Uniqueness is enforced by idx_orders_code.
func newCode(now time.Time) string {
	return "ORD-" + now.Format("20060102") + "-" + security.RandomStringWithAlphabet(6, codeAlphabet)
}
