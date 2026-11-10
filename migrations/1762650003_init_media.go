package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		folders := findOrNewBase(app, "media_folders")
		addMissing(folders,
			&core.TextField{Name: "name", Required: true},
			&core.TextField{Name: "parent_id"},
			&core.TextField{Name: "color"},
			&core.TextField{Name: "user_id"},
		)
		addMissing(folders, timestamps()...)
		folders.AddIndex("idx_media_folders_parent", false, "parent_id", "")
		folders.ListRule, folders.ViewRule = authOnly, authOnly
		folders.CreateRule, folders.UpdateRule, folders.DeleteRule = nil, nil, nil
		if err := app.Save(folders); err != nil {
			return err
		}

		files := findOrNewBase(app, "media_files")
		addMissing(files,
			&core.TextField{Name: "name"},
			&core.TextField{Name: "original_name"},
			&core.FileField{Name: "file", MaxSelect: 1, MaxSize: 50 << 20},
			&core.TextField{Name: "mime_type"},
			&core.NumberField{Name: "size", Min: types.Pointer(0.0)},
			&core.TextField{Name: "folder_id"},
			&core.TextField{Name: "user_id"},
		)
		addMissing(files, timestamps()...)
		files.AddIndex("idx_media_files_folder", false, "folder_id", "")
		files.ListRule, files.ViewRule = authOnly, authOnly
		files.CreateRule, files.UpdateRule, files.DeleteRule = nil, nil, nil
		return app.Save(files)
	}, func(app core.App) error {
		if err := deleteIfExists(app, "media_files"); err != nil {
			return err
		}
		return deleteIfExists(app, "media_folders")
	})
}

