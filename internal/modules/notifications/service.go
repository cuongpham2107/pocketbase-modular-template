package notifications

import (
	"errors"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

var ErrNotFound = errors.New("không tìm thấy thông báo")

type service struct {
	app core.App
}

// visibleTo matches the user's own notifications plus broadcasts (empty user_id).
func visibleTo(userID string) dbx.Expression {
	return dbx.Or(dbx.HashExp{"user_id": ""}, dbx.HashExp{"user_id": userID})
}

func unread() dbx.Expression {
	return dbx.Or(dbx.HashExp{"read_at": ""}, dbx.HashExp{"read_at": nil})
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

// ponytail: read_at lives on the record, so reading a broadcast marks it read for everyone.
// Add a notification_reads (user, notification) collection when per-user read state on broadcasts matters.
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

func (s service) find(userID, id string) (*core.Record, error) {
	recs, err := s.app.FindAllRecords("notifications", dbx.HashExp{"id": id}, visibleTo(userID))
	if err != nil || len(recs) == 0 {
		return nil, ErrNotFound
	}
	return recs[0], nil
}
