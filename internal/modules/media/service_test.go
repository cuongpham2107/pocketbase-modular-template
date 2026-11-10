package media

import (
	"testing"

	"ganigeorgiev.com/pocketbase/pocketbase/tests"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/filesystem"

	_ "cuongpham2107/pocketbase-custom/migrations"
)

func newTestService(t *testing.T) service {
	t.Helper()
	app, err := tests.NewTestApp()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Cleanup)
	return service{app: app}
}

func TestFoldersAndFilesLifecycle(t *testing.T) {
	svc := newTestService(t)

	root, err := svc.CreateFolder("u1", "Tài liệu", "", "#3b82f6")
	if err != nil {
		t.Fatal(err)
	}
	child, err := svc.CreateFolder("u1", "Hợp đồng", root.ID, "#10b981")
	if err != nil {
		t.Fatal(err)
	}

	f, err := filesystem.NewFileFromBytes([]byte("hello pocketbase media"), "contract.txt")
	if err != nil {
		t.Fatal(err)
	}
	rec, err := svc.Upload("u1", child.ID, f)
	if err != nil {
		t.Fatal(err)
	}
	dto := toFileDTO(rec)
	if dto.URL == "" || dto.Size == 0 {
		t.Fatalf("expected non-empty URL and size, got %+v", dto)
	}

	tree, err := svc.FolderTree()
	if err != nil || len(tree) != 1 || len(tree[0].Children) != 1 {
		t.Fatalf("unexpected folder tree: %+v (err=%v)", tree, err)
	}
	if tree[0].Children[0].FilesCount != 1 {
		t.Fatalf("expected child folder files_count=1, got %d", tree[0].Children[0].FilesCount)
	}

	// Rename file
	renamed, err := svc.RenameFile(rec.Id, "contract-v2.txt")
	if err != nil || renamed.GetString("name") != "contract-v2.txt" {
		t.Fatalf("rename failed: %v", err)
	}

	// Copy file
	copied, err := svc.CopyFile("u1", rec.Id, root.ID)
	if err != nil || copied.Id == rec.Id {
		t.Fatalf("copy failed: %v", err)
	}

	// Delete child folder promotes its files back to root (empty folder_id)
	if err := svc.DeleteFolder(child.ID); err != nil {
		t.Fatalf("delete folder failed: %v", err)
	}

	allFiles, err := svc.ListFiles(FileFilter{})
	if err != nil || len(allFiles) != 2 {
		t.Fatalf("expected 2 files after copy, got %d (err=%v)", len(allFiles), err)
	}
}

