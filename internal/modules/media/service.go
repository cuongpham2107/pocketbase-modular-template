package media

import (
	"errors"
	"io"
	"mime"
	"path/filepath"
	"strings"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/filesystem"
)

var (
	ErrNotFound     = errors.New("không tìm thấy dữ liệu")
	ErrNameRequired = errors.New("tên không được để trống")
	ErrFileRequired = errors.New("tập tin tải lên không hợp lệ")
)

type service struct {
	app core.App
}

type FileFilter struct {
	FolderID string
	Type     string // all, image, video, document, other
	Search   string
}

type FolderDTO struct {
	ID         string       `json:"id"`
	ParentID   *string      `json:"parent_id"`
	UserID     string       `json:"user_id"`
	Name       string       `json:"name"`
	Color      string       `json:"color"`
	CreatedAt  string       `json:"created_at"`
	UpdatedAt  string       `json:"updated_at"`
	Children   []*FolderDTO `json:"children"`
	FilesCount int          `json:"files_count"`
}

type FileDTO struct {
	ID            string  `json:"id"`
	FolderID      *string `json:"folder_id"`
	UserID        string  `json:"user_id"`
	OriginalName  string  `json:"original_name"`
	Filename      string  `json:"filename"`
	FileName      string  `json:"file_name"`
	URL           string  `json:"url"`
	FileURL       string  `json:"file_url"`
	Size          int64   `json:"size"`
	FileSize      int64   `json:"file_size"`
	MimeType      string  `json:"mime_type"`
	StorageDriver string  `json:"storage_driver"`
	CreatedAt     string  `json:"created_at"`
}

func toFileDTO(r *core.Record) FileDTO {
	var folderID *string
	if v := r.GetString("folder_id"); v != "" {
		folderID = &v
	}
	stored := r.GetString("file")
	display := r.GetString("name")
	if display == "" {
		display = r.GetString("original_name")
	}
	if display == "" {
		display = stored
	}
	fileURL := ""
	if stored != "" {
		fileURL = "/api/files/" + r.Collection().Id + "/" + r.Id + "/" + stored
	}
	size := int64(r.GetFloat("size"))
	return FileDTO{
		ID:            r.Id,
		FolderID:      folderID,
		UserID:        r.GetString("user_id"),
		OriginalName:  display,
		Filename:      stored,
		FileName:      display,
		URL:           fileURL,
		FileURL:       fileURL,
		Size:          size,
		FileSize:      size,
		MimeType:      r.GetString("mime_type"),
		StorageDriver: "pocketbase",
		CreatedAt:     r.GetString("created"),
	}
}

func (s service) Upload(userID, folderID string, f *filesystem.File) (*core.Record, error) {
	if f == nil {
		return nil, ErrFileRequired
	}
	col, err := s.app.FindCollectionByNameOrId("media_files")
	if err != nil {
		return nil, err
	}
	origName := strings.TrimSpace(f.OriginalName)
	if origName == "" {
		origName = f.Name
	}
	mimeType := mime.TypeByExtension(strings.ToLower(filepath.Ext(origName)))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	rec := core.NewRecord(col)
	rec.Set("user_id", userID)
	rec.Set("folder_id", strings.TrimSpace(folderID))
	rec.Set("name", origName)
	rec.Set("original_name", origName)
	rec.Set("mime_type", mimeType)
	rec.Set("size", f.Size)
	rec.Set("file", f)
	if err := s.app.Save(rec); err != nil {
		return nil, err
	}
	return rec, nil
}

func (s service) ListFiles(f FileFilter) ([]FileDTO, error) {
	q := s.app.RecordQuery("media_files").OrderBy("created DESC")
	if f.FolderID != "" {
		q.AndWhere(dbx.HashExp{"folder_id": f.FolderID})
	}
	if qStr := strings.TrimSpace(f.Search); qStr != "" {
		q.AndWhere(dbx.Or(
			dbx.Like("name", qStr),
			dbx.Like("original_name", qStr),
		))
	}
	switch strings.ToLower(strings.TrimSpace(f.Type)) {
	case "image", "images":
		q.AndWhere(dbx.Like("mime_type", "image/"))
	case "video", "videos":
		q.AndWhere(dbx.Like("mime_type", "video/"))
	case "document", "documents", "doc":
		q.AndWhere(dbx.Or(
			dbx.Like("mime_type", "pdf"),
			dbx.Like("mime_type", "text/"),
			dbx.Like("mime_type", "word"),
			dbx.Like("mime_type", "sheet"),
			dbx.Like("mime_type", "excel"),
		))
	}
	var recs []*core.Record
	if err := q.All(&recs); err != nil {
		return nil, err
	}
	out := make([]FileDTO, 0, len(recs))
	for _, r := range recs {
		out = append(out, toFileDTO(r))
	}
	return out, nil
}

func (s service) RenameFile(id, name string) (*core.Record, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, ErrNameRequired
	}
	rec, err := s.app.FindRecordById("media_files", id)
	if err != nil {
		return nil, ErrNotFound
	}
	rec.Set("name", name)
	rec.Set("original_name", name)
	return rec, s.app.Save(rec)
}

func (s service) MoveFiles(ids []string, folderID string) error {
	folderID = strings.TrimSpace(folderID)
	return s.app.RunInTransaction(func(tx core.App) error {
		for _, id := range ids {
			rec, err := tx.FindRecordById("media_files", id)
			if err != nil {
				return ErrNotFound
			}
			rec.Set("folder_id", folderID)
			if err := tx.Save(rec); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s service) CopyFile(userID, id, targetFolderID string) (*core.Record, error) {
	src, err := s.app.FindRecordById("media_files", id)
	if err != nil {
		return nil, ErrNotFound
	}
	col, err := s.app.FindCollectionByNameOrId("media_files")
	if err != nil {
		return nil, err
	}

	dst := core.NewRecord(col)
	dst.Set("user_id", userID)
	dst.Set("folder_id", strings.TrimSpace(targetFolderID))
	origName := src.GetString("original_name")
	if origName == "" {
		origName = src.GetString("name")
	}
	copyName := "Copy of " + origName
	dst.Set("name", copyName)
	dst.Set("original_name", copyName)
	dst.Set("mime_type", src.GetString("mime_type"))
	dst.Set("size", src.GetFloat("size"))

	// Duplicate underlying storage object if present
	if stored := src.GetString("file"); stored != "" {
		fsys, err := s.app.NewFilesystem()
		if err == nil {
			defer fsys.Close()
			key := src.BaseFilesPath() + "/" + stored
			if r, err := fsys.GetReader(key); err == nil {
				if data, err := io.ReadAll(r); err == nil {
					_ = r.Close()
					if f, err := filesystem.NewFileFromBytes(data, origName); err == nil {
						dst.Set("file", f)
					}
				} else {
					_ = r.Close()
				}
			}
		}
	}

	if err := s.app.Save(dst); err != nil {
		return nil, err
	}
	return dst, nil
}

func (s service) DeleteFile(id string) error {
	rec, err := s.app.FindRecordById("media_files", id)
	if err != nil {
		return ErrNotFound
	}
	return s.app.Delete(rec)
}

func (s service) CreateFolder(userID, name, parentID, color string) (*FolderDTO, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, ErrNameRequired
	}
	if color = strings.TrimSpace(color); color == "" {
		color = "#3b82f6"
	}
	col, err := s.app.FindCollectionByNameOrId("media_folders")
	if err != nil {
		return nil, err
	}
	rec := core.NewRecord(col)
	rec.Set("user_id", userID)
	rec.Set("name", name)
	rec.Set("parent_id", strings.TrimSpace(parentID))
	rec.Set("color", color)
	if err := s.app.Save(rec); err != nil {
		return nil, err
	}
	dto := toFolderDTO(rec, 0)
	return dto, nil
}

func (s service) UpdateFolder(id, name, parentID, color string) (*FolderDTO, error) {
	rec, err := s.app.FindRecordById("media_folders", id)
	if err != nil {
		return nil, ErrNotFound
	}
	if name = strings.TrimSpace(name); name != "" {
		rec.Set("name", name)
	}
	rec.Set("parent_id", strings.TrimSpace(parentID))
	if color = strings.TrimSpace(color); color != "" {
		rec.Set("color", color)
	}
	if err := s.app.Save(rec); err != nil {
		return nil, err
	}
	cnt, _ := s.app.CountRecords("media_files", dbx.HashExp{"folder_id": rec.Id})
	return toFolderDTO(rec, int(cnt)), nil
}

func (s service) DeleteFolder(id string) error {
	rec, err := s.app.FindRecordById("media_folders", id)
	if err != nil {
		return ErrNotFound
	}
	return s.app.RunInTransaction(func(tx core.App) error {
		// Unassign files in this folder back to root so files are not orphaned.
		files, _ := tx.FindAllRecords("media_files", dbx.HashExp{"folder_id": id})
		for _, f := range files {
			f.Set("folder_id", "")
			if err := tx.Save(f); err != nil {
				return err
			}
		}
		// Promote child folders to root
		children, _ := tx.FindAllRecords("media_folders", dbx.HashExp{"parent_id": id})
		for _, ch := range children {
			ch.Set("parent_id", "")
			if err := tx.Save(ch); err != nil {
				return err
			}
		}
		return tx.Delete(rec)
	})
}

func (s service) FolderTree() ([]*FolderDTO, error) {
	folders, err := s.app.FindRecordsByFilter("media_folders", "", "name", 0, 0)
	if err != nil {
		return []*FolderDTO{}, nil
	}
	files, _ := s.app.FindAllRecords("media_files")
	counts := make(map[string]int)
	for _, f := range files {
		if fid := f.GetString("folder_id"); fid != "" {
			counts[fid]++
		}
	}

	byID := make(map[string]*FolderDTO, len(folders))
	nodes := make([]*FolderDTO, 0, len(folders))
	for _, r := range folders {
		n := toFolderDTO(r, counts[r.Id])
		byID[r.Id] = n
		nodes = append(nodes, n)
	}

	roots := make([]*FolderDTO, 0)
	for _, n := range nodes {
		if n.ParentID != nil && *n.ParentID != "" {
			if parent, ok := byID[*n.ParentID]; ok && parent.ID != n.ID {
				parent.Children = append(parent.Children, n)
				continue
			}
		}
		roots = append(roots, n)
	}
	return roots, nil
}

func toFolderDTO(r *core.Record, filesCount int) *FolderDTO {
	var parentID *string
	if p := r.GetString("parent_id"); p != "" {
		parentID = &p
	}
	return &FolderDTO{
		ID:         r.Id,
		ParentID:   parentID,
		UserID:     r.GetString("user_id"),
		Name:       r.GetString("name"),
		Color:      r.GetString("color"),
		CreatedAt:  r.GetString("created"),
		UpdatedAt:  r.GetString("updated"),
		Children:   []*FolderDTO{},
		FilesCount: filesCount,
	}
}

