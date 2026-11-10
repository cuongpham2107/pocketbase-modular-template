package orders

import (
	"errors"
	"regexp"
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/tests"

	_ "cuongpham2107/pocketbase-custom/migrations"
)

func newService(t *testing.T) service {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)
	return service{app: app}
}

func TestCreateValidates(t *testing.T) {
	svc := newService(t)
	cases := []struct {
		name string
		in   CreateInput
		want error
	}{
		{"missing customer", CreateInput{CustomerName: "  ", Total: 10}, ErrCustomerRequired},
		{"negative total", CreateInput{CustomerName: "A", Total: -1}, ErrNegativeTotal},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, err := svc.Create("", c.in); !errors.Is(err, c.want) {
				t.Fatalf("got %v, want %v", err, c.want)
			}
		})
	}
}

func TestCreateThenConfirmOnce(t *testing.T) {
	svc := newService(t)

	rec, err := svc.Create("", CreateInput{CustomerName: "Nguyễn Văn A", Total: 120000})
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`^ORD-\d{8}-[A-Z2-9]{6}$`).MatchString(rec.GetString("code")) {
		t.Fatalf("unexpected code %q", rec.GetString("code"))
	}
	if got := rec.GetString("status"); got != StatusPending {
		t.Fatalf("status = %q, want pending", got)
	}

	if _, err := svc.Confirm(rec.Id); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Confirm(rec.Id); !errors.Is(err, ErrNotPending) {
		t.Fatalf("second confirm: got %v, want ErrNotPending", err)
	}
	if _, err := svc.Confirm("missing"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("missing: got %v, want ErrNotFound", err)
	}
}
