package notifications

import (
	"errors"
	"testing"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/tests"

	_ "cuongpham2107/pocketbase-custom/migrations"
)

func newTestService(t *testing.T) service {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)
	initHooksAndJobs(app)
	return service{app: app}
}

func TestNotificationsLifecycle(t *testing.T) {
	svc := newTestService(t)

	if _, err := svc.Create(CreateInput{Title: "   "}); !errors.Is(err, ErrTitleRequired) {
		t.Fatalf("got %v, want ErrTitleRequired", err)
	}

	// Broadcast notification
	bcast, err := svc.Create(CreateInput{
		Type:  "system",
		Title: "Bảo trì hệ thống",
		Body:  "Hệ thống sẽ bảo trì lúc 02:00",
	})
	if err != nil {
		t.Fatal(err)
	}

	// Personal notification for user-1
	personal, err := svc.Create(CreateInput{
		UserID: "user-1",
		Type:   "info",
		Title:  "Đơn hàng mới",
	})
	if err != nil {
		t.Fatal(err)
	}

	// user-1 sees both broadcast + personal (2)
	if n, err := svc.UnreadCount("user-1"); err != nil || n != 2 {
		t.Fatalf("user-1 unread = %d (err=%v), want 2", n, err)
	}

	// user-2 sees only broadcast (1)
	if n, err := svc.UnreadCount("user-2"); err != nil || n != 1 {
		t.Fatalf("user-2 unread = %d (err=%v), want 1", n, err)
	}

	// Mark personal read
	if err := svc.MarkRead("user-1", personal.Id); err != nil {
		t.Fatal(err)
	}
	if n, _ := svc.UnreadCount("user-1"); n != 1 {
		t.Fatalf("after markRead: user-1 unread = %d, want 1", n)
	}

	// CleanOldRead removes read items before future cutoff
	deleted, err := svc.CleanOldRead(time.Now().Add(time.Hour))
	if err != nil || deleted != 1 {
		t.Fatalf("CleanOldRead deleted=%d err=%v, want 1", deleted, err)
	}

	// Broadcast without canDeleteBroadcast is rejected
	if err := svc.Delete("user-1", bcast.Id, false); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound when deleting broadcast without permission, got %v", err)
	}
	if err := svc.Delete("user-1", bcast.Id, true); err != nil {
		t.Fatalf("delete broadcast with permission failed: %v", err)
	}
}

