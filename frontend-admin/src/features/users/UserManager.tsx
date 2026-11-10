import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Edit2,
  KeyRound,
  Mail,
  MoreVertical,
  Shield,
  Trash2,
  User as UserIcon,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  ConfirmDeleteDialog,
  FormField,
  PageCard,
  PageErrorBanner,
  PageHeader,
  PagePagination,
  PageSearchInput,
  PageSegmentedFilter,
  PageShell,
  PageToolbar,
  RefreshButton,
  ResponsiveDataTable,
  type ResponsiveColumn,
} from "@/components/layout/page"
import { api } from "@/lib/api"
import type { User } from "@/types"

function UserAvatar({ user }: { user: User }) {
  const displayName = user.full_name || user.name || "Chưa đặt tên"
  const isAdmin = user.role === "admin"
  const initial = displayName.charAt(0).toUpperCase()

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={displayName}
        className="size-8 shrink-0 rounded-full border border-border/60 object-cover"
      />
    )
  }

  return (
    <div
      className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isAdmin
          ? "border border-primary/25 bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {initial}
    </div>
  )
}

function RoleBadge({ role }: { role?: string }) {
  if (role === "admin") {
    return (
      <Badge className="border-primary/25 bg-primary/10 text-[10px] font-semibold text-primary hover:bg-primary/15">
        <Shield className="mr-1 size-3" />
        ADMIN
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="border-border/70 text-[10px] font-medium text-muted-foreground"
    >
      <UserCheck className="mr-1 size-3" />
      USER
    </Badge>
  )
}

export function UserManager() {
  const { t } = useTranslation()
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)
  const [totalItems, setTotalItems] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [search, setSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<"all" | "admin" | "user">("all")

  // Unified Form Modal State ("create" | "edit") + Delete Dialog State
  const [formModalMode, setFormModalMode] = React.useState<"create" | "edit" | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
    avatar_url: "",
  })

  // Tham số truy vấn đổi → bật loading/xoá lỗi ngay trong render
  const queryKey = `${page}|${limit}|${search}|${roleFilter}`
  const [prevQueryKey, setPrevQueryKey] = React.useState(queryKey)
  if (queryKey !== prevQueryKey) {
    setPrevQueryKey(queryKey)
    setLoading(true)
    setErrorMsg(null)
  }

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
        .catch((err: unknown) => {
          setErrorMsg(
            err instanceof Error ? err.message : "Không thể tải danh sách người dùng",
          )
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

  const handleOpenCreate = () => {
    setSelectedUser(null)
    setFormData({
      email: "",
      password: "",
      full_name: "",
      role: "user",
      avatar_url: "",
    })
    setErrorMsg(null)
    setFormModalMode("create")
  }

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
    setFormModalMode("edit")
  }

  const handleOpenDelete = (user: User) => {
    setSelectedUser(user)
    setErrorMsg(null)
    setShowDeleteDialog(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formModalMode === "create") {
      if (!formData.email || !formData.password || !formData.full_name) {
        setErrorMsg("Vui lòng điền đầy đủ email, mật khẩu và họ tên")
        return
      }
    } else if (!selectedUser) {
      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)
      if (formModalMode === "create") {
        await api.createUser(formData)
        toast.success(`Đã tạo tài khoản ${formData.email}`)
      } else if (selectedUser) {
        await api.updateUser(selectedUser.id, {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          avatar_url: formData.avatar_url,
          password: formData.password || undefined,
        })
        toast.success(`Đã cập nhật tài khoản ${formData.email}`)
      }
      setFormModalMode(null)
      void fetchUsers()
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : formModalMode === "create"
            ? "Tạo người dùng thất bại"
            : "Cập nhật người dùng thất bại",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return
    try {
      setSubmitting(true)
      setErrorMsg(null)
      await api.deleteUser(selectedUser.id)
      toast.success(`Đã xóa tài khoản ${selectedUser.email}`)
      setShowDeleteDialog(false)
      void fetchUsers()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Xóa người dùng thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  const renderRowActions = (user: User) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7 rounded-lg cursor-pointer">
          <MoreVertical className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 text-xs">
        <DropdownMenuItem onClick={() => handleOpenEdit(user)} className="cursor-pointer">
          <Edit2 className="mr-2 size-3.5 text-primary" />
          Sửa thông tin
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleOpenDelete(user)}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-3.5" />
          Xóa tài khoản
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const columns: ResponsiveColumn<User>[] = [
    {
      key: "id",
      header: "ID",
      headerClassName: "w-16 text-center text-muted-foreground",
      cellClassName: "text-center font-mono text-[11px] text-muted-foreground",
      hideOnMobile: true,
      render: (user) => `#${String(user.id).slice(0, 8)}`,
    },
    {
      key: "name",
      header: t("users.name"),
      render: (user) => {
        const displayName = user.full_name || user.name || "Chưa đặt tên"
        return (
          <div className="flex items-center gap-3">
            <UserAvatar user={user} />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-semibold text-foreground">
                {displayName}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                UID: {user.id}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: "email",
      header: t("users.email"),
      cellClassName: "font-mono text-xs text-foreground/80",
      render: (user) => user.email,
    },
    {
      key: "role",
      header: t("users.role"),
      render: (user) => <RoleBadge role={user.role} />,
    },
    {
      key: "created",
      header: t("users.createdAt"),
      cellClassName: "text-xs text-muted-foreground",
      hideOnMobile: true,
      render: (user) =>
        user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—",
    },
    {
      key: "actions",
      header: t("users.actions"),
      headerClassName: "text-right text-muted-foreground pr-4",
      cellClassName: "text-right pr-4",
      render: (user) => renderRowActions(user),
    },
  ]

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
            <RefreshButton loading={loading} onClick={() => void fetchUsers()} />
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-8 cursor-pointer gap-1.5 text-xs font-semibold"
            >
              <UserPlus className="size-3.5" />
              {t("users.addUser")}
            </Button>
          </>
        }
      />

      <PageCard>
        <PageToolbar>
          <PageSearchInput
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder={t("users.searchPlaceholder")}
          />

          <PageSegmentedFilter
            label="Vai trò:"
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val)
              setPage(1)
            }}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "admin", label: "Admin" },
              { value: "user", label: "User" },
            ]}
          />
        </PageToolbar>

        {!formModalMode && !showDeleteDialog && <PageErrorBanner message={errorMsg} />}

        <ResponsiveDataTable
          data={users}
          keyExtractor={(u) => u.id}
          columns={columns}
          loading={loading}
          loadingText="Đang tải danh sách người dùng..."
          emptyIcon={UserIcon}
          emptyTitle={t("users.empty")}
          emptyDescription="Thử tìm kiếm với từ khóa khác hoặc tạo tài khoản mới."
          renderMobileCard={(user) => {
            const displayName = user.full_name || user.name || "Chưa đặt tên"
            return (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <UserAvatar user={user} />
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-xs font-bold text-foreground">
                        {displayName}
                      </span>
                      <RoleBadge role={user.role} />
                    </div>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      <span>#{String(user.id).slice(0, 8)}</span>
                      {user.created_at && (
                        <>
                          <span>·</span>
                          <span>
                            {new Date(user.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {renderRowActions(user)}
              </div>
            )
          }}
        />

        <PagePagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={limit}
          itemLabel="người dùng"
          loading={loading}
          onPageChange={setPage}
          onPerPageChange={setLimit}
        />
      </PageCard>

      {/* Modal Tạo / Sửa Người Dùng Gộp Chung */}
      <Dialog
        open={formModalMode !== null}
        onOpenChange={(open) => !open && setFormModalMode(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {formModalMode === "create" ? (
                <>
                  <UserPlus className="size-4 text-primary" />
                  <span>Thêm Người Dùng Mới</span>
                </>
              ) : (
                <>
                  <Edit2 className="size-4 text-primary" />
                  <span>Sửa Thông Tin Người Dùng</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {formModalMode === "create"
                ? "Tạo tài khoản mới và chỉ định vai trò trong hệ thống."
                : `Cập nhật thông tin hoặc đổi mật khẩu cho #${selectedUser?.id} - ${selectedUser?.email}`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-3.5 py-2">
            {errorMsg && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            <FormField
              label="Họ và tên"
              icon={UserIcon}
              required={formModalMode === "create"}
            >
              <Input
                required={formModalMode === "create"}
                placeholder="Ví dụ: Nguyễn Văn A"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="h-9 text-xs"
              />
            </FormField>

            <FormField
              label="Địa chỉ Email"
              icon={Mail}
              required={formModalMode === "create"}
            >
              <Input
                required={formModalMode === "create"}
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 text-xs"
              />
            </FormField>

            <FormField
              label={
                formModalMode === "create" ? "Mật khẩu khởi tạo" : "Đổi mật khẩu mới"
              }
              icon={KeyRound}
              required={formModalMode === "create"}
              hint={
                formModalMode === "edit" ? "(để trống nếu giữ nguyên)" : undefined
              }
            >
              <Input
                required={formModalMode === "create"}
                type="password"
                placeholder={
                  formModalMode === "create"
                    ? "Tối thiểu 6 ký tự"
                    : "Nhập mật khẩu mới..."
                }
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-9 text-xs"
              />
            </FormField>

            <FormField label="Vai trò (Role)" icon={Shield}>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="h-9 w-full rounded-md border border-border/70 bg-background px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="user">User (Người dùng tiêu chuẩn)</option>
                <option value="admin">Admin (Quản trị viên toàn quyền)</option>
              </select>
            </FormField>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormModalMode(null)}
                disabled={submitting}
                className="h-8 cursor-pointer text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 cursor-pointer text-xs font-semibold"
              >
                {submitting
                  ? "Đang lưu..."
                  : formModalMode === "create"
                    ? "Xác nhận tạo"
                    : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Xác Nhận Xóa Dùng Chung */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xác Nhận Xóa Tài Khoản"
        description={
          <>
            Bạn có chắc chắn muốn xóa người dùng{" "}
            <strong>{selectedUser?.full_name || selectedUser?.email}</strong> (#
            {selectedUser?.id})? Thao tác này không thể hoàn tác.
          </>
        }
        error={errorMsg}
        loading={submitting}
        onConfirm={handleDeleteSubmit}
      />
    </PageShell>
  )
}
