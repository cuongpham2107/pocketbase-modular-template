package notifications

import (
	"errors"
	"strings"
	"time"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

var (
	ErrNotFound      = errors.New("không tìm thấy thông báo")
	ErrTitleRequired = errors.New("tiêu đề thông báo không được để trống")
)

type service struct {
	app core.App
}

// CreateInput is the payload for creating a personal or broadcast notification.
type CreateInput struct {
	UserID string `json:"user_id"` // empty = broadcast to all users
	Type   string `json:"type"`
	Title  string `json:"title"`
	Body   string `json:"body"`
	Data   string `json:"data"`
}

// visibleTo matches the user's own notifications plus broadcasts (empty user_id).
func visibleTo(userID string) dbx.Expression {
	return dbx.Or(dbx.HashExp{"user_id": ""}, dbx.HashExp{"user_id": userID})
}

func unread() dbx.Expression {
	return dbx.Or(dbx.HashExp{"read_at": ""}, dbx.HashExp{"read_at": nil})
}

func (s service) Create(in CreateInput) (*core.Record, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return nil, ErrTitleRequired
	}
	typ := strings.TrimSpace(in.Type)
	if typ == "" {
		typ = "info"
	}
	col, err := s.app.FindCollectionByNameOrId("notifications")
	if err != nil {
		return nil, err
	}
	rec := core.NewRecord(col)
	rec.Set("user_id", strings.TrimSpace(in.UserID))
	rec.Set("type", typ)
	rec.Set("title", title)
	rec.Set("body", strings.TrimSpace(in.Body))
	rec.Set("data", strings.TrimSpace(in.Data))
	return rec, s.app.Save(rec)
}

func (s service) List(userID string, unreadOnly bool, limit, offset int) ([]*core.Record, int64, error) {
	exprs := []dbx.Expression{visibleTo(userID)}
	if unreadOnly {
		exprs = append(exprs, unread())
	}
	total, err := s.app.CountRecords("notifications", exprs...)
	if err != nil {
		return nil, 0, err
	}
	q := s.app.RecordQuery("notifications").OrderBy("created DESC").Limit(int64(limit)).Offset(int64(offset))
	for _, ex := range exprs {
		q.AndWhere(ex)
	}
	var recs []*core.Record
	return recs, total, q.All(&recs)
}

func (s service) UnreadCount(userID string) (int64, error) {
	return s.app.CountRecords("notifications", visibleTo(userID), unread())
}

// MarkAllRead marks all unread notifications visible to userID as read inside a transaction.
func (s service) MarkAllRead(userID string) (int, error) {
	recs, err := s.app.FindAllRecords("notifications", visibleTo(userID), unread())
	if err != nil {
		return 0, err
	}
	now := types.NowDateTime().String()
	err = s.app.RunInTransaction(func(tx core.App) error {
		for _, r := range recs {
			r.Set("read_at", now)
			if err := tx.Save(r); err != nil {
				return err
			}
		}
		return nil
	})
	return len(recs), err
}

func (s service) MarkRead(userID, id string) error {
	rec, err := s.find(userID, id)
	if err != nil {
		return err
	}
	rec.Set("read_at", types.NowDateTime().String())
	return s.app.Save(rec)
}

// Delete removes the user's own notification; broadcasts need canDeleteBroadcast.
func (s service) Delete(userID, id string, canDeleteBroadcast bool) error {
	rec, err := s.find(userID, id)
	if err != nil {
		return err
	}
	if rec.GetString("user_id") == "" && !canDeleteBroadcast {
		return ErrNotFound
	}
	return s.app.Delete(rec)
}

// CleanOldRead deletes read notifications created before the cutoff time.
func (s service) CleanOldRead(cutoff time.Time) (int, error) {
	cutoffStr := cutoff.UTC().Format(types.DefaultDateLayout)
	recs, err := s.app.FindAllRecords("notifications",
		dbx.Not(unread()),
		dbx.NewExp("created < {:cutoff}", dbx.Params{"cutoff": cutoffStr}),
	)
	if err != nil {
		return 0, err
	}
	deleted := 0
	err = s.app.RunInTransaction(func(tx core.App) error {
		for _, r := range recs {
			if err := tx.Delete(r); err != nil {
				return err
			}
			deleted++
		}
		return nil
	})
	return deleted, err
}

func (s service) find(userID, id string) (*core.Record, error) {
	recs, err := s.app.FindAllRecords("notifications", dbx.HashExp{"id": id}, visibleTo(userID))
	if err != nil || len(recs) == 0 {
		return nil, ErrNotFound
	}
	return recs[0], nil
}
