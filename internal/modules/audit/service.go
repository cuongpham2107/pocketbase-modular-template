package audit

import (
	"fmt"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// Filter is the audit list query.
type Filter struct {
	Query, Status, Action, Resource string
	Limit, Offset                   int
}

// Item is one audit entry derived from a request log.
type Item struct {
	ID         string `json:"id"`
	ActorID    string `json:"actor_id,omitempty"`
	ActorEmail string `json:"actor_email"`
	Action     string `json:"action"`
	Resource   string `json:"resource"`
	ResourceID string `json:"resource_id,omitempty"`
	Status     string `json:"status"`
	IP         string `json:"ip"`
	UserAgent  string `json:"user_agent"`
	RequestID  string `json:"request_id"`
	TraceID    string `json:"trace_id"`
	Detail     string `json:"detail"`
	CreatedAt  string `json:"created_at"`
}

type service struct {
	app core.App
}

// Noisy endpoints hidden from the audit trail.
var hiddenPaths = []string{"/notifications/stream", "/health", "/notifications/unread-count"}

func (s service) List(f Filter) ([]Item, int64, error) {
	exprs := []dbx.Expression{dbx.NewExp("json_extract(data, '$.type') = 'request'")}
	for _, p := range hiddenPaths {
		exprs = append(exprs, dbx.Not(dbx.Like("message", p)))
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		exprs = append(exprs, dbx.Or(dbx.Like("message", q), dbx.Like("data", q)))
	}
	if a := strings.TrimSpace(f.Action); a != "" && a != "all" {
		exprs = append(exprs, dbx.NewExp("json_extract(data, '$.method') = {:m}", dbx.Params{"m": strings.ToUpper(a)}))
	}
	switch f.Status {
	case "success":
		exprs = append(exprs, dbx.NewExp("CAST(json_extract(data, '$.status') AS INTEGER) < 400"))
	case "failure":
		exprs = append(exprs, dbx.NewExp("CAST(json_extract(data, '$.status') AS INTEGER) >= 400"))
	}
	if r := strings.TrimSpace(f.Resource); r != "" && r != "all" {
		exprs = append(exprs, dbx.Like("message", r))
	}
	where := dbx.And(exprs...)

	var total int64
	if err := s.app.LogQuery().Select("count(*)").Where(where).Row(&total); err != nil {
		return nil, 0, err
	}
	var logs []*core.Log
	err := s.app.LogQuery().Where(where).OrderBy("created DESC").
		Limit(int64(f.Limit)).Offset(int64(f.Offset)).All(&logs)
	if err != nil {
		return nil, 0, err
	}

	emails := s.actorEmails(logs)
	items := make([]Item, 0, len(logs))
	for _, l := range logs {
		items = append(items, toItem(l, emails))
	}
	return items, total, nil
}

// actorEmails resolves "collection:id" → email for every actor on the page in one query per collection.
func (s service) actorEmails(logs []*core.Log) map[string]string {
	ids := map[string][]any{}
	for _, l := range logs {
		col, id := str(l.Data, "auth"), str(l.Data, "authId")
		if col != "" && id != "" {
			ids[col] = append(ids[col], id)
		}
	}
	out := map[string]string{}
	for col, list := range ids {
		recs, err := s.app.FindAllRecords(col, dbx.In("id", list...))
		if err != nil {
			continue // collection renamed/removed: actor falls back to its id
		}
		for _, r := range recs {
			out[col+":"+r.Id] = r.Email()
		}
	}
	return out
}

func toItem(l *core.Log, emails map[string]string) Item {
	method, url := str(l.Data, "method"), str(l.Data, "url")
	status := 0
	if v, ok := l.Data["status"].(float64); ok {
		status = int(v)
	}
	execTime, _ := l.Data["execTime"].(float64)
	ip := str(l.Data, "userIP")
	if ip == "" {
		ip = str(l.Data, "remoteIP")
	}

	resource, resourceID := parseResource(url)
	col, actorID := str(l.Data, "auth"), str(l.Data, "authId")
	actor := "Khách (Anonymous)"
	switch {
	case emails[col+":"+actorID] != "":
		actor = emails[col+":"+actorID]
	case actorID != "":
		actor = actorID
	case col != "":
		actor = col
	}
	if col == core.CollectionNameSuperusers {
		actor += " (Superuser)"
	}

	itemStatus := "success"
	if status >= 400 || status == 0 {
		itemStatus = "failure"
	}

	return Item{
		ID:         l.Id,
		ActorID:    actorID,
		ActorEmail: actor,
		Action:     method,
		Resource:   resource,
		ResourceID: resourceID,
		Status:     itemStatus,
		IP:         ip,
		UserAgent:  str(l.Data, "userAgent"),
		RequestID:  l.Id,
		TraceID:    l.Id,
		Detail:     fmt.Sprintf("%s %s · HTTP %d (%.2fms)", method, url, status, execTime),
		CreatedAt:  l.Created.String(),
	}
}

// parseResource maps "/api/v1/users/abc?x" → ("users", "abc") and "/api/collections/x/records/id" → ("x", "id").
func parseResource(url string) (string, string) {
	path, _, _ := strings.Cut(url, "?")
	for _, prefix := range []string{"/api/v1/", "/api/collections/", "/api/"} {
		if strings.HasPrefix(path, prefix) {
			path = strings.TrimPrefix(path, prefix)
			break
		}
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if parts[0] == "" {
		return "system", ""
	}
	if len(parts) > 2 && parts[1] == "records" {
		return parts[0], parts[2]
	}
	if len(parts) > 1 && parts[1] != "records" {
		return parts[0], parts[1]
	}
	return parts[0], ""
}

func str(m map[string]any, key string) string {
	v, _ := m[key].(string)
	return v
}
