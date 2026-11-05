package jobs

import "ganigeorgiev.com/pocketbase/pocketbase/core"

func Register(app core.App) {
    app.Cron().MustAdd("cleanup", "0 3 * * *", func() {
        // chạy lúc 3h sáng mỗi ngày
    })
}