package rbac

// Permission Code constants
const (
	// Users module
	PermUsersView   = "users:view"
	PermUsersCreate = "users:create"
	PermUsersUpdate = "users:update"
	PermUsersDelete = "users:delete"

	// Roles & RBAC module
	PermRolesView   = "roles:view"
	PermRolesCreate = "roles:create"
	PermRolesUpdate = "roles:update"
	PermRolesDelete = "roles:delete"
	PermRolesManage = "roles:manage"

	// Audit Logs module
	PermAuditView = "audit:view"

	// Notifications module
	PermNotificationsView = "notifications:view"
	PermNotificationsSend = "notifications:send"

	// Media module
	PermMediaView   = "media:view"
	PermMediaCreate = "media:create"
	PermMediaUpdate = "media:update"
	PermMediaDelete = "media:delete"
	PermMediaUpload = "media:upload"
)

// PermissionItem represents a single permission entry in code
type PermissionItem struct {
	Code        string `json:"code"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Module      string `json:"module"`
}

// PermissionGroup represents a module category for UI display
type PermissionGroup struct {
	Module      string           `json:"module"`
	Label       string           `json:"label"`
	Permissions []PermissionItem `json:"permissions"`
}

// CoverageReport represents the shield/coverage report for RBAC UI
type CoverageReport struct {
	TotalCatalog int                `json:"total_catalog"`
	TotalActive  int                `json:"total_active"`
	TotalRoles   int                `json:"total_roles"`
	CoverageRate float64            `json:"coverage_rate"`
	Groups       []PermissionGroup  `json:"groups"`
	MissingInDb  []string           `json:"missing_in_db"`
	Deprecated   []string           `json:"deprecated"`
}

// DefaultCatalog returns the canonical list of permissions grouped by module
func DefaultCatalog() []PermissionGroup {
	return []PermissionGroup{
		{
			Module: "users",
			Label:  "Quản lý Người Dùng",
			Permissions: []PermissionItem{
				{Code: PermUsersView, Label: "Xem người dùng", Description: "Xem danh sách và chi tiết người dùng", Module: "users"},
				{Code: PermUsersCreate, Label: "Tạo người dùng", Description: "Thêm tài khoản người dùng mới", Module: "users"},
				{Code: PermUsersUpdate, Label: "Sửa người dùng", Description: "Chỉnh sửa thông tin tài khoản người dùng", Module: "users"},
				{Code: PermUsersDelete, Label: "Xoá người dùng", Description: "Xoá tài khoản người dùng khỏi hệ thống", Module: "users"},
			},
		},
		{
			Module: "roles",
			Label:  "Vai Trò & Phân Quyền",
			Permissions: []PermissionItem{
				{Code: PermRolesView, Label: "Xem vai trò", Description: "Xem danh sách và chi tiết các vai trò", Module: "roles"},
				{Code: PermRolesCreate, Label: "Tạo vai trò", Description: "Tạo vai trò mới trong hệ thống", Module: "roles"},
				{Code: PermRolesUpdate, Label: "Sửa vai trò", Description: "Chỉnh sửa vai trò và phân quyền", Module: "roles"},
				{Code: PermRolesDelete, Label: "Xoá vai trò", Description: "Xoá vai trò người dùng", Module: "roles"},
				{Code: PermRolesManage, Label: "Quản trị quyền", Description: "Toàn quyền quản trị và điều phối phân quyền", Module: "roles"},
			},
		},
		{
			Module: "audit",
			Label:  "Nhật Ký Hệ Thống",
			Permissions: []PermissionItem{
				{Code: PermAuditView, Label: "Xem nhật ký", Description: "Tra cứu lịch sử thao tác hệ thống", Module: "audit"},
			},
		},
		{
			Module: "notifications",
			Label:  "Thông Báo",
			Permissions: []PermissionItem{
				{Code: PermNotificationsView, Label: "Xem thông báo", Description: "Xem danh sách thông báo gửi đến", Module: "notifications"},
				{Code: PermNotificationsSend, Label: "Gửi thông báo", Description: "Phát hành thông báo mới", Module: "notifications"},
			},
		},
		{
			Module: "media",
			Label:  "Đa Phương Tiện & File",
			Permissions: []PermissionItem{
				{Code: PermMediaView, Label: "Xem media", Description: "Xem danh sách tập tin tải lên", Module: "media"},
				{Code: PermMediaUpload, Label: "Tải lên media", Description: "Tải file mới lên hệ thống", Module: "media"},
				{Code: PermMediaDelete, Label: "Xoá media", Description: "Xoá tập tin khỏi kho lưu trữ", Module: "media"},
			},
		},
	}
}

// FlatCatalog returns all permissions as a flat list
func FlatCatalog() []PermissionItem {
	var list []PermissionItem
	for _, group := range DefaultCatalog() {
		list = append(list, group.Permissions...)
	}
	return list
}

