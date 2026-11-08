import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Shield,
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  User as UserIcon,
} from "lucide-react"

import { api } from "@/lib/api"
import type { User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageCard, PageFooter, PageHeader, PageShell, PageToolbar } from "@/components/layout/page"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function UserManager() {
  const { t } = useTranslation()
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [totalItems, setTotalItems] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState("all")

  // Modal State
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  // Form State
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
    avatar_url: "",
  })

  // Tham số truy vấn đổi → bật loading/xoá lỗi ngay trong render (mẫu "lưu giá trị trước đó"),
  // effect bên dưới chỉ gọi API.
  const queryKey = `${page}|${limit}|${search}|${roleFilter}`
  const [prevQueryKey, setPrevQueryKey] = React.useState(queryKey)
  if (queryKey !== prevQueryKey) {
    setPrevQueryKey(queryKey)
    setLoading(true)
    setErrorMsg(null)
  }

  // Fetch Users — setState chỉ trong callback của promise.
  const loadUsers = React.useCallback(
    () =>
      api
        .listUsersPaginated({
          page,
          limit,
          search: search.trim() || undefined,
          role: roleFilter !== "all" ? roleFilter : undefined,
        })
        .then((res) => {
          setUsers(res.data)
          setTotalItems(res.pagination.total_items)
          setTotalPages(res.pagination.total_pages)
        })
        .catch((err: any) => {
          setErrorMsg(err.message || "Không thể tải danh sách người dùng")
        })
        .finally(() => setLoading(false)),
    [page, limit, search, roleFilter],
  )

  const fetchUsers = React.useCallback(() => {
    setLoading(true)
    setErrorMsg(null)
    return loadUsers()
  }, [loadUsers])

  React.useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  // Reset to page 1 on search or filter change
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
  }

  const handleRoleFilterChange = (val: string) => {
    setRoleFilter(val)
    setPage(1)
  }

  // Open Create
  const handleOpenCreate = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
      role: "user",
      avatar_url: "",
    })
    setErrorMsg(null)
    setShowCreateModal(true)
  }

  // Open Edit
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: "",
      full_name: user.full_name || user.name || "",
      role: user.role || "user",
      avatar_url: user.avatar_url || "",
    })
    setErrorMsg(null)
    setShowEditModal(true)
  }

  // Open Delete
  const handleOpenDelete = (user: User) => {
    setSelectedUser(user)
    setErrorMsg(null)
    setShowDeleteDialog(true)
  }

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.password || !formData.full_name) {
      setErrorMsg("Vui lòng điền đầy đủ email, mật khẩu và họ tên")
      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)
      await api.createUser(formData)
      setShowCreateModal(false)
      fetchUsers()
    } catch (err: any) {
      setErrorMsg(err.message || "Tạo người dùng thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      setSubmitting(true)
      setErrorMsg(null)
      await api.updateUser(selectedUser.id, {
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        avatar_url: formData.avatar_url,
        password: formData.password || undefined,
      })
      setShowEditModal(false)
      fetchUsers()
    } catch (err: any) {
      setErrorMsg(err.message || "Cập nhật người dùng thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return

    try {
      setSubmitting(true)
      setErrorMsg(null)
      await api.deleteUser(selectedUser.id)
      setShowDeleteDialog(false)
      fetchUsers()
    } catch (err: any) {
      setErrorMsg(err.message || "Xóa người dùng thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <PageHeader
        icon={Users}
        title={t("users.title")}
        description={t("users.description")}
        badge={
          <Badge variant="outline" className="px-2 py-0.5 font-mono text-[11px]">
            {totalItems} tài khoản
          </Badge>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchUsers()}
              disabled={loading}
              className="h-8 gap-1.5 text-xs"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <UserPlus className="size-3.5" />
              {t("users.addUser")}
            </Button>
          </>
        }
      />

      <PageCard>
        <PageToolbar>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("users.searchPlaceholder")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] text-muted-foreground font-medium">Vai trò:</span>
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60 text-xs">
            <button
              type="button"
              onClick={() => handleRoleFilterChange("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                roleFilter === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange("admin")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                roleFilter === "admin" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange("user")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                roleFilter === "user" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
            >
              User
            </button>
          </div>
        </div>
        </PageToolbar>

      {/* Error Alert if any */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {errorMsg}
        </div>
      )}

      {/* Data Table */}
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-12 text-center text-xs font-bold text-muted-foreground">ID</TableHead>
              <TableHead className="text-xs font-bold text-foreground">{t("users.name")}</TableHead>
              <TableHead className="text-xs font-bold text-foreground">{t("users.email")}</TableHead>
              <TableHead className="text-xs font-bold text-foreground">{t("users.role")}</TableHead>
              <TableHead className="text-xs font-bold text-foreground">{t("users.createdAt")}</TableHead>
              <TableHead className="text-right text-xs font-bold text-muted-foreground pr-4">{t("users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Đang tải danh sách người dùng...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserIcon className="size-8 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">{t("users.empty")}</p>
                    <p className="text-[11px] text-muted-foreground">Thử tìm kiếm với từ khóa khác hoặc tạo tài khoản mới.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const displayName = user.full_name || user.name || "Chưa đặt tên"
                const isAdmin = user.role === "admin"
                const initial = displayName.charAt(0).toUpperCase()

                return (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors border-border/50">
                    <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                      #{user.id}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={displayName}
                            className="size-8 rounded-full object-cover border border-border/60"
                          />
                        ) : (
                          <div className={`size-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isAdmin ? "bg-primary/15 text-primary border border-primary/25" : "bg-muted text-muted-foreground"
                          }`}>
                            {initial}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground">{displayName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">UID: {user.id}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-foreground/80">
                      {user.email}
                    </TableCell>

                    <TableCell>
                      {isAdmin ? (
                        <Badge className="bg-primary/10 text-primary border-primary/25 hover:bg-primary/15 font-semibold text-[10px]">
                          <Shield className="size-3 mr-1" />
                          ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-border/70 font-medium text-[10px]">
                          <UserCheck className="size-3 mr-1" />
                          USER
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-7 rounded-lg">
                            <MoreVertical className="size-3.5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                          <DropdownMenuItem onClick={() => handleOpenEdit(user)} className="cursor-pointer">
                            <Edit2 className="size-3.5 mr-2 text-primary" />
                            Sửa thông tin
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenDelete(user)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Xóa tài khoản
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        <PageFooter>
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="bg-background border border-border/60 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>trên tổng số <strong className="text-foreground">{totalItems}</strong> người dùng</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              Trang {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 text-xs"
            >
              <ChevronLeft className="size-3.5 mr-1" />
              Trước
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 text-xs"
            >
              Sau
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </div>
        </PageFooter>
      </PageCard>

      {/* Modal Tạo Người Dùng */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4 text-primary" />
              Thêm Người Dùng Mới
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tạo tài khoản mới và chỉ định vai trò trong hệ thống.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-2">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UserIcon className="size-3.5 text-muted-foreground" />
                Họ và tên *
              </label>
              <Input
                required
                placeholder="Ví dụ: Nguyễn Văn A"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-muted-foreground" />
                Địa chỉ Email *
              </label>
              <Input
                required
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="size-3.5 text-muted-foreground" />
                Mật khẩu khởi tạo *
              </label>
              <Input
                required
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="size-3.5 text-muted-foreground" />
                Vai trò (Role)
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-9 rounded-md border border-border/70 bg-background px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="user">User (Người dùng tiêu chuẩn)</option>
                <option value="admin">Admin (Quản trị viên toàn quyền)</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
                className="h-8 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs font-semibold"
              >
                {submitting ? "Đang tạo..." : "Xác nhận tạo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Sửa Người Dùng */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit2 className="size-4 text-primary" />
              Sửa Thông Tin Người Dùng
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cập nhật thông tin hoặc đổi mật khẩu cho #{selectedUser?.id} - {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 py-2">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Họ và tên</label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Địa chỉ Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Vai trò</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-9 rounded-md border border-border/70 bg-background px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="user">User (Người dùng tiêu chuẩn)</option>
                <option value="admin">Admin (Quản trị viên toàn quyền)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Đổi mật khẩu mới</span>
                <span className="text-[10px] text-muted-foreground font-normal">(để trống nếu giữ nguyên)</span>
              </label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu mới..."
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
                className="h-8 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs font-semibold"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Xóa Người Dùng */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="size-4" />
              Xác Nhận Xóa Tài Khoản
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1">
              Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser?.full_name || selectedUser?.email}</strong> (#{selectedUser?.id})? Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
              disabled={submitting}
              className="h-8 text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSubmit}
              disabled={submitting}
              className="h-8 text-xs font-semibold"
            >
              {submitting ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
