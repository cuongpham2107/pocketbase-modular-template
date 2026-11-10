package users

import (
	"errors"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

var (
	ErrNotFound       = errors.New("người dùng không tồn tại")
	ErrPasswordNeeded = errors.New("mật khẩu là bắt buộc")
	ErrDeleteSelf     = errors.New("không thể tự xoá tài khoản đang đăng nhập")
)

type service struct {
	app core.App
}

// ListFilter is the users list query.
type ListFilter struct {
	Search string
	Role   string
	Limit  int
	Offset int
}

// List returns one page of users plus the total count, filtered in SQL.
func (s service) List(f ListFilter) ([]*core.Record, int64, error) {
	var exprs []dbx.Expression
	if f.Search != "" {
		exprs = append(exprs, dbx.Or(dbx.Like("name", f.Search), dbx.Like("email", f.Search)))
	}
	if f.Role != "" && f.Role != "all" {
		role, err := s.app.FindFirstRecordByData("roles", "name", f.Role)
		if err != nil {
			return []*core.Record{}, 0, nil // unknown role → empty result
		}
		exprs = append(exprs, dbx.Like("roles", role.Id)) // roles is a JSON array of ids
	}

	total, err := s.app.CountRecords("users", exprs...)
	if err != nil {
		return nil, 0, err
	}

	q := s.app.RecordQuery("users").OrderBy("created DESC").Limit(int64(f.Limit)).Offset(int64(f.Offset))
	for _, ex := range exprs {
		q.AndWhere(ex)
	}
	var recs []*core.Record
	if err := q.All(&recs); err != nil {
		return nil, 0, err
	}
	return recs, total, nil
}

// UserInput is the create/update payload. Empty fields are left unchanged on update.
type UserInput struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
	Password string `json:"password"`
}

func (s service) Create(in UserInput) (*core.Record, error) {
	if in.Password == "" {
		return nil, ErrPasswordNeeded
	}
	col, err := s.app.FindCollectionByNameOrId("users")
	if err != nil {
		return nil, err
	}
	rec := core.NewRecord(col)
	if err := s.apply(rec, in); err != nil {
		return nil, err
	}
	return rec, s.app.Save(rec)
}

func (s service) Update(id string, in UserInput) (*core.Record, error) {
	rec, err := s.app.FindRecordById("users", id)
	if err != nil {
		return nil, ErrNotFound
	}
	if err := s.apply(rec, in); err != nil {
		return nil, err
	}
	return rec, s.app.Save(rec)
}

func (s service) Delete(id, actorID string) error {
	if id == actorID {
		return ErrDeleteSelf
	}
	rec, err := s.app.FindRecordById("users", id)
	if err != nil {
		return ErrNotFound
	}
	return s.app.Delete(rec)
}

func (s service) apply(rec *core.Record, in UserInput) error {
	if v := strings.TrimSpace(in.Email); v != "" {
		rec.Set("email", v)
	}
	if v := strings.TrimSpace(in.FullName); v != "" {
		rec.Set("name", v)
	}
	if in.Password != "" {
		rec.SetPassword(in.Password)
	}
	if in.Role != "" {
		role, err := s.app.FindFirstRecordByData("roles", "name", in.Role)
		if err != nil {
			return errors.New("vai trò không tồn tại: " + in.Role)
		}
		rec.Set("roles", []string{role.Id})
	}
	return nil
}
