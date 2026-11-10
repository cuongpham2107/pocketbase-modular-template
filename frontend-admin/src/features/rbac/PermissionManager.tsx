import * as React from "react"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "motion/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PageHeader, PageShell, RefreshButton } from "@/components/layout/page"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import type {
  CoverageReport,
  PermissionGroup,
  Role,
  User,
} from "@/types"
import {
  Shield,
  ShieldCheck,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  Users,
  Layers,
  Sparkles,
  Eye,
  PlusCircle,
  Pencil,
  Trash2,
  SlidersHorizontal,
  CheckCircle2,
  X,
  Search,
  UserPlus,
  BookOpen,
  FolderArchive,
} from "lucide-react"

export interface PermissionManagerProps {
  currentUser?: User | null
}

/** Tải dữ liệu trang phân quyền và xác định role ban đầu (không đụng state React). */
async function fetchRbacData(selectedRole: Role | null, isCreatingNewRole: boolean) {
  const [rList, uList, catList, cov] = await Promise.all([
    api.listRoles().catch(() => [] as Role[]),
    api.listUsers().catch(() => [] as User[]),
    api.listPermissionsCatalog().catch(() => [] as PermissionGroup[]),
    api.getPermissionsCoverage().catch(() => null),
  ])

  // Xác định role ban đầu và tải trước danh sách user của role đó
  let initialRole: Role | null = selectedRole
  if (!initialRole && rList.length > 0 && !isCreatingNewRole) {
    initialRole = rList.find((r) => r.name.toLowerCase() === "admin") || rList[0]
  } else if (initialRole) {
    initialRole = rList.find((r) => r.id === initialRole!.id) || initialRole
  }

  let initialUserIds: (string | number)[] = []
  if (initialRole) {
    try {
      const uIds = await api.getRoleUsers(initialRole.id)
      initialUserIds = Array.isArray(uIds) ? uIds : []
    } catch {
      initialUserIds = []
    }
  }

  return { rList, uList, catList, cov, initialRole, initialUserIds }
}

export function PermissionManager({ currentUser: _currentUser }: PermissionManagerProps = {}) {
  const { t } = useTranslation()
  // ---------------------------------------------------------------------------
  // Data State
  // ---------------------------------------------------------------------------
  const [roles, setRoles] = React.useState<Role[]>([])
  const [allUsers, setAllUsers] = React.useState<User[]>([])
  const [catalogGroups, setCatalogGroups] = React.useState<PermissionGroup[]>([])
  const [, setCoverage] = React.useState<CoverageReport | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // Selected Role & Permissions State
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [isCreatingNewRole, setIsCreatingNewRole] = React.useState(false)
  const [roleName, setRoleName] = React.useState("")
  const [roleDescription, setRoleDescription] = React.useState("")
  const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
  const [assignedUserIds, setAssignedUserIds] = React.useState<(string | number)[]>([])

  // User Search / Multi-Select Dropdown State
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false)
  const [userSearchQuery, setUserSearchQuery] = React.useState("")
  const userDropdownRef = React.useRef<HTMLDivElement>(null)

  // UI Feedback
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  // Toàn bộ setState nằm trong callback của promise (không đồng bộ trong effect).
  // Nhận role đang chọn / cờ tạo mới làm tham số để callback ổn định.
  const loadData = React.useCallback(
    (selectedRole: Role | null, isCreatingNewRole: boolean) =>
      fetchRbacData(selectedRole, isCreatingNewRole)
        .then(({ rList, uList, catList, cov, initialRole, initialUserIds }) => {
          // Cập nhật đồng bộ toàn bộ state trong 1 lần duy nhất, tránh render nhảy giật
          React.startTransition(() => {
            setRoles(rList)
            setAllUsers(uList)
            setCatalogGroups(catList)
            setCoverage(cov)
            if (initialRole) {
              setSelectedRole(initialRole)
              setRoleName(initialRole.name)
              setRoleDescription(initialRole.description || "")
              setSelectedCodes(initialRole.permissions || [])
              setAssignedUserIds(initialUserIds)
            }
          })
        })
        .catch((err: unknown) => {
          setFeedback({
            type: "error",
            text: err instanceof Error ? err.message : "Lỗi khi tải dữ liệu phân quyền",
          })
        })
        .finally(() => setLoading(false)),
    [],
  )

  const fetchData = () => {
    setLoading(true)
    return loadData(selectedRole, isCreatingNewRole)
  }

  React.useEffect(() => {
    void loadData(null, false)
  }, [loadData])

  // Đóng dropdown khi click ra ngoài
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ---------------------------------------------------------------------------
  // Role Selection & User Mapping
  // ---------------------------------------------------------------------------
  const selectRole = async (role: Role) => {
    setIsCreatingNewRole(false)
    setSelectedRole(role)
    setRoleName(role.name)
    setRoleDescription(role.description || "")
    setSelectedCodes(role.permissions || [])
    setFeedback(null)

    // Tải danh sách user đang được gán vai trò này
    try {
      const uIds = await api.getRoleUsers(role.id)
      setAssignedUserIds(Array.isArray(uIds) ? uIds : [])
    } catch {
      setAssignedUserIds([])
    }
  }

  const startCreateNewRole = () => {
    setIsCreatingNewRole(true)
    setSelectedRole(null)
    setRoleName("")
    setRoleDescription("")
    setSelectedCodes([])
    setAssignedUserIds([])
    setFeedback(null)
  }

  const cancelCreate = () => {
    if (roles.length > 0) {
      selectRole(roles[0])
    } else {
      setIsCreatingNewRole(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Multi-Select Users Logic
  // ---------------------------------------------------------------------------
  const toggleUserAssignment = (userId: string | number) => {
    setAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const removeUserAssignment = (userId: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    setAssignedUserIds((prev) => prev.filter((id) => id !== userId))
  }

  const filteredUsers = React.useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase()
    if (!q) return allUsers
    return allUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
    )
  }, [allUsers, userSearchQuery])

  // ---------------------------------------------------------------------------
  // Permission Selection Logic
  // ---------------------------------------------------------------------------
  const allCatalogCodes = React.useMemo(() => {
    return catalogGroups.flatMap((g) => g.permissions.map((p) => p.code))
  }, [catalogGroups])

  const togglePermission = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  const applySelectAll = () => {
    setSelectedCodes([...allCatalogCodes])
  }

  const applyViewOnly = () => {
    const viewCodes = catalogGroups.flatMap((g) =>
      g.permissions
        .filter((p) => p.action === "view" || p.code.endsWith(":view"))
        .map((p) => p.code)
    )
    setSelectedCodes(viewCodes)
  }

  const applyFullCRUD = () => {
    const crudCodes = catalogGroups.flatMap((g) =>
      g.permissions
        .filter(
          (p) =>
            p.is_default ||
            ["view", "create", "update", "delete"].includes(p.action || "")
        )
        .map((p) => p.code)
    )
    setSelectedCodes(crudCodes)
  }

  const applyClearAll = () => {
    setSelectedCodes([])
  }

  const toggleModelAll = (group: PermissionGroup) => {
    const groupCodes = group.permissions.map((p) => p.code)
    const allChecked = groupCodes.every((code) => selectedCodes.includes(code))
    if (allChecked) {
      setSelectedCodes((prev) => prev.filter((c) => !groupCodes.includes(c)))
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...groupCodes])))
    }
  }

  // ---------------------------------------------------------------------------
  // Save Role, Permissions & Users (Unified Flow)
  // ---------------------------------------------------------------------------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    const cleanName = roleName.trim().toLowerCase()
    if (!cleanName) {
      setFeedback({ type: "error", text: "Vui lòng nhập mã vai trò" })
      return
    }

    setSaving(true)
    try {
      let targetRole: Role

      if (isCreatingNewRole) {
        targetRole = await api.createRole(cleanName, roleDescription.trim(), selectedCodes)
        setIsCreatingNewRole(false)
      } else if (selectedRole) {
        targetRole = selectedRole
        await api.assignPermissionsToRole(selectedRole.id, selectedCodes)
      } else {
        return
      }

      // Đồng bộ gán Users cho vai trò này
      await api.assignUsersToRole(targetRole.id, assignedUserIds)

      setFeedback({
        type: "success",
        text: `Đã lưu thành công vai trò "${targetRole.name}": Cấp ${selectedCodes.length} quyền cho ${assignedUserIds.length} người dùng!`,
      })

      await fetchData()
      await selectRole(targetRole)
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Thao tác thất bại. Vui lòng thử lại",
      })
    } finally {
      setSaving(false)
    }
  }

  // Helper icons
  const getModelIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case "users":
        return <Users className="h-4 w-4 text-blue-500" />
      case "files":
      case "media":
      case "media_folders":
        return <FolderArchive className="h-4 w-4 text-amber-500" />
      case "roles":
        return <Shield className="h-4 w-4 text-indigo-500" />
      case "pages":
        return <BookOpen className="h-4 w-4 text-emerald-500" />
      default:
        return <Layers className="h-4 w-4 text-primary" />
    }
  }

  const getActionInfo = (action: string) => {
    switch (action.toLowerCase()) {
      case "view":
        return { label: "Xem", icon: <Eye className="h-3.5 w-3.5" /> }
      case "create":
        return { label: "Thêm", icon: <PlusCircle className="h-3.5 w-3.5" /> }
      case "update":
        return { label: "Sửa", icon: <Pencil className="h-3.5 w-3.5" /> }
      case "delete":
        return { label: "Xóa", icon: <Trash2 className="h-3.5 w-3.5" /> }
      default:
        return { label: action, icon: <Sparkles className="h-3.5 w-3.5" /> }
    }
  }

  const selectedPct =
    allCatalogCodes.length > 0
      ? Math.round((selectedCodes.length / allCatalogCodes.length) * 100)
      : 0

  return (
    <PageShell className="gap-6">
      <PageHeader
        icon={ShieldCheck}
        title={t("rbac.title")}
        description={t("rbac.description")}
        badge={
          <Badge
            variant="secondary"
            className="flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Go Code Catalog Sync</span>
          </Badge>
        }
        actions={
          <RefreshButton loading={loading} onClick={fetchData} title="Đồng bộ lại dữ liệu" />
        }
      />

      {/* 2. Global Feedback Banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-xs overflow-hidden ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span className="font-medium">{feedback.text}</span>
            </div>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setFeedback(null)}
              className="h-6 px-2 text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              Đóng
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Unified Role & Permission Dashboard (NO Extra Tabs) */}
      <Card className="border-border/60 shadow-xs bg-card/70 backdrop-blur-sm rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-4 border-b border-border/40 space-y-4">
          {/* Row 1: Role Switcher & Save Button */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Horizontal Role Pills Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Vai trò:
              </span>

              {roles.map((r) => {
                const isSelected = !isCreatingNewRole && selectedRole?.id === r.id
                const count = r.permissions?.length || 0
                const total = allCatalogCodes.length || 14

                return (
                  <motion.button
                    key={r.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => selectRole(r)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/30"
                        : "bg-muted/40 hover:bg-muted text-foreground border border-border/50"
                    }`}
                  >
                    <span className="uppercase font-mono">{r.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}/{total}
                    </span>
                  </motion.button>
                )
              })}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  size="sm"
                  variant={isCreatingNewRole ? "default" : "outline"}
                  onClick={startCreateNewRole}
                  className={`h-7 text-xs px-2.5 rounded-xl border-dashed cursor-pointer ${
                    isCreatingNewRole
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-primary border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Tạo vai trò mới
                </Button>
              </motion.div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-2">
              {isCreatingNewRole && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelCreate}
                  className="text-xs h-8 px-3 cursor-pointer"
                >
                  Hủy
                </Button>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="sm"
                  className="text-xs h-8 px-4 font-bold shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      {isCreatingNewRole
                        ? "Tạo Vai Trò & Gán Người Dùng"
                        : "Lưu Phân Quyền & Người Dùng"}
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Row 2: Role Meta Inputs & Progress Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Mã Vai Trò (Role Name) <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="ví dụ: editor, accountant..."
                value={roleName}
                onChange={(e) => setRoleName(e.target.value.toLowerCase().trim())}
                disabled={!isCreatingNewRole && selectedRole?.name === "admin"}
                className="font-mono text-xs h-8 bg-background/80"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Mô Tả Nhiệm Vụ
              </label>
              <Input
                placeholder="ví dụ: Quản lý người dùng và duyệt tài liệu"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                className="text-xs h-8 bg-background/80"
              />
            </div>

            <div className="sm:col-span-3 flex flex-col justify-end">
              <div className="flex items-center justify-between text-[11px] mb-1 font-mono text-muted-foreground">
                <span>Tiến độ cấp quyền:</span>
                <span className="font-bold text-foreground">
                  {selectedCodes.length}/{allCatalogCodes.length} ({selectedPct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedPct}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              </div>
            </div>
          </div>

          {/* Row 3: 🌟 MULTI-SELECT USERS ASSIGNED TO THIS ROLE */}
          <div className="pt-2 border-t border-border/30" ref={userDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span>Người Dùng Được Gán Vai Trò Này:</span>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                  {assignedUserIds.length} người dùng
                </Badge>
              </label>

              <span className="text-[10px] text-muted-foreground">
                Chọn nhiều người dùng để cấp vai trò <strong>{roleName || "này"}</strong>
              </span>
            </div>

            {/* Selected User Pills Container & Add Button */}
            <div className="p-2 rounded-xl border border-border/60 bg-background/80 min-h-10 flex flex-wrap items-center gap-1.5">
              <AnimatePresence>
                {assignedUserIds.map((uId) => {
                  const userObj = allUsers.find((u) => u.id === uId)
                  const label = userObj ? userObj.email : `User #${uId}`

                  return (
                    <motion.div
                      key={uId}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 shadow-2xs"
                    >
                      <span className="font-mono text-[11px]">{label}</span>
                      <button
                        type="button"
                        onClick={(e) => removeUserAssignment(uId, e)}
                        className="size-4 rounded-full flex items-center justify-center hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                        title="Bỏ gán người dùng"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Button Trigger Open Multi-Select Dropdown */}
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className="h-7 text-xs px-2.5 rounded-lg border-dashed text-primary border-primary/40 hover:bg-primary/5 flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>+ Chọn người dùng</span>
                </Button>

                {/* Dropdown Popover */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute left-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl p-3 space-y-2.5"
                    >
                      {/* Search box inside dropdown */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Tìm người dùng theo email/tên..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="h-8 pl-8 text-xs bg-background/90"
                          autoFocus
                        />
                      </div>

                      {/* User List with Checkboxes */}
                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        {filteredUsers.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground">
                            Không tìm thấy người dùng phù hợp
                          </div>
                        ) : (
                          filteredUsers.map((u) => {
                            const isChecked = assignedUserIds.includes(u.id)

                            return (
                              <div
                                key={u.id}
                                onClick={() => toggleUserAssignment(u.id)}
                                className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold"
                                    : "hover:bg-muted text-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Checkbox checked={isChecked} />
                                  <div className="min-w-0">
                                    <div className="truncate font-mono text-xs">{u.email}</div>
                                    {u.name && (
                                      <div className="text-[10px] text-muted-foreground truncate">
                                        {u.name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                  #{u.id}
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Đã chọn: <strong>{assignedUserIds.length}</strong>
                        </span>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setUserDropdownOpen(false)}
                          className="h-6 px-2 text-xs text-primary font-bold cursor-pointer"
                        >
                          Xong
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Row 4: Quick Presets Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Thao tác chọn quyền nhanh:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={applySelectAll}
                  className="text-[11px] h-7 px-2.5 rounded-lg hover:bg-primary/5 hover:text-primary hover:border-primary/40 cursor-pointer"
                >
                  ⚡ Chọn tất cả
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={applyViewOnly}
                  className="text-[11px] h-7 px-2.5 rounded-lg hover:bg-primary/5 hover:text-primary hover:border-primary/40 cursor-pointer"
                >
                  👁️ Chỉ xem (View Only)
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={applyFullCRUD}
                  className="text-[11px] h-7 px-2.5 rounded-lg hover:bg-primary/5 hover:text-primary hover:border-primary/40 cursor-pointer"
                >
                  🛠️ Toàn bộ CRUD
                </Button>
              </motion.div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={applyClearAll}
                className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Bỏ chọn
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content: List of Model Resource Cards with Motion */}
        <CardContent className="p-4 sm:p-5 space-y-4">
          {catalogGroups.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Đang tải danh mục Model Resources từ Go backend...
            </div>
          ) : (
            catalogGroups.map((group) => {
              const groupCodes = group.permissions.map((p) => p.code)
              const checkedInGroup = groupCodes.filter((c) => selectedCodes.includes(c))
              const allChecked =
                groupCodes.length > 0 && checkedInGroup.length === groupCodes.length

              const crudPermissions = group.permissions.filter(
                (p) =>
                  p.is_default ||
                  ["view", "create", "update", "delete"].includes(p.action || "")
              )
              const customPermissions = group.permissions.filter(
                (p) =>
                  !p.is_default &&
                  !["view", "create", "update", "delete"].includes(p.action || "")
              )

              return (
                <div
                  key={group.module}
                  className="rounded-2xl border border-border/70 bg-card/90 shadow-2xs overflow-hidden transition-colors hover:border-border hover:shadow-xs"
                >
                  {/* Model Card Header */}
                  <div className="p-3.5 px-4 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-8 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0 shadow-2xs">
                        {getModelIcon(group.module)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase tracking-wide text-foreground truncate">
                            {group.label || group.module}
                          </span>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] px-1.5 py-0 bg-background/80"
                          >
                            {group.module}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {checkedInGroup.length} / {group.permissions.length} quyền được cấp
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => toggleModelAll(group)}
                      className="text-xs h-7 px-2.5 font-medium text-primary hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                    >
                      {allChecked ? "Bỏ chọn model" : "Chọn cả model"}
                    </Button>
                  </div>

                  {/* Model Card Body */}
                  <div className="p-4 space-y-3.5">
                    {/* Section 1: Standard CRUD Tiles */}
                    {crudPermissions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Quyền CRUD Chuẩn:
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {crudPermissions.map((p) => {
                            const checked = selectedCodes.includes(p.code)
                            const action = p.action || "view"
                            const actionMeta = getActionInfo(action)

                            return (
                              <motion.div
                                key={p.code}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                onClick={() => togglePermission(p.code)}
                                className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col justify-between gap-2 select-none transition-colors duration-150 ${
                                  checked
                                    ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                                    : "bg-muted/20 hover:bg-muted/50 border-border/50 text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={
                                        checked
                                          ? "text-primary"
                                          : "text-muted-foreground opacity-70"
                                      }
                                    >
                                      {actionMeta.icon}
                                    </span>
                                    <span className="text-xs font-bold text-foreground">
                                      {actionMeta.label}
                                    </span>
                                  </div>
                                  <Checkbox checked={checked} />
                                </div>

                                <div className="text-[10px] font-mono opacity-60 truncate">
                                  {p.code}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Custom Actions Tiles */}
                    {customPermissions.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border/30">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <Sparkles className="size-3 text-amber-500" />
                          <span>Quyền Mở Rộng (Custom Actions):</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {customPermissions.map((p) => {
                            const checked = selectedCodes.includes(p.code)

                            return (
                              <motion.div
                                key={p.code}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                onClick={() => togglePermission(p.code)}
                                className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between select-none transition-colors duration-150 ${
                                  checked
                                    ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                                    : "bg-muted/20 hover:bg-muted/50 border-border/50 text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Checkbox checked={checked} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-foreground truncate">
                                        {p.label || p.code}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] font-mono px-1 py-0 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                      >
                                        CUSTOM
                                      </Badge>
                                    </div>
                                    <div className="text-[10px] font-mono opacity-60 truncate mt-0.5">
                                      {p.code}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
