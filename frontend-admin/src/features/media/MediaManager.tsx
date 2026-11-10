import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  Trash2,
  MoveRight,
  Copy,
  Check,
  Search,
  LayoutGrid,
  List,
  X,
  HardDrive,
  Images,
  Film,
  FileBox,
  Edit2,
  ClipboardPaste,
  Scissors,
  Eye,
  RefreshCw,
  FolderPen,
} from "lucide-react"
import { PageHeader, PageShell } from "@/components/layout/page"
import { useTranslation } from "react-i18next"

import { api } from "@/lib/api"
import type { MediaFolder, UploadedFile, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MediaManagerProps {
  currentUser?: User | null
}

const FOLDER_COLORS = [
  { label: "Xanh Dương", hex: "#3b82f6", bg: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  { label: "Vàng Hổ Phách", hex: "#f59e0b", bg: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { label: "Xanh Lục", hex: "#10b981", bg: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { label: "Tím Thạch Anh", hex: "#8b5cf6", bg: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  { label: "Hồng Đào", hex: "#f43f5e", bg: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
  { label: "Cam Hoàng Hôn", hex: "#f97316", bg: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  { label: "Xám Bạc", hex: "#64748b", bg: "bg-slate-500/15 text-slate-500 border-slate-500/30" },
]

function findFolder(nodes: MediaFolder[], id: string | number): MediaFolder | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children && node.children.length > 0) {
      const found = findFolder(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function MediaManager({ currentUser: _currentUser }: MediaManagerProps) {
  const { t } = useTranslation()
  // State: Dữ liệu
  const [folderTree, setFolderTree] = React.useState<MediaFolder[]>([])
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  // true ngay từ đầu: effect mount nạp file ngay.
  const [loadingFiles, setLoadingFiles] = React.useState(true)

  // State: Điều hướng thư mục & Bộ lọc
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | number | null>(null)
  const [activeTypeFilter, setActiveTypeFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid")

  // State: Folder Tree mở rộng
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string | number>>(new Set())

  // State: Clipboard cho Copy & Move
  const [clipboard, setClipboard] = React.useState<{
    type: "copy" | "move"
    file: UploadedFile
  } | null>(null)
  const [copiedUrl, setCopiedUrl] = React.useState<string | number | null>(null)
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)

  // State: Modal tạo/sửa thư mục
  const [showFolderModal, setShowFolderModal] = React.useState(false)
  const [folderModalMode, setFolderModalMode] = React.useState<"create" | "edit">("create")
  const [editingFolderId, setEditingFolderId] = React.useState<string | number | null>(null)
  const [folderFormName, setFolderFormName] = React.useState("")
  const [folderFormParentId, setFolderFormParentId] = React.useState<string | number | null>(null)
  const [folderFormColor, setFolderFormColor] = React.useState("#3b82f6")

  // State: Modal di chuyển file
  const [showMoveFileModal, setShowMoveFileModal] = React.useState(false)
  const [movingFile, setMovingFile] = React.useState<UploadedFile | null>(null)
  const [targetFolderId, setTargetFolderId] = React.useState<string | number | null>(null)

  // State: Modal đổi tên file
  const [showRenameFileModal, setShowRenameFileModal] = React.useState(false)
  const [renamingFile, setRenamingFile] = React.useState<UploadedFile | null>(null)
  const [newFileName, setNewFileName] = React.useState("")

  // State: File Preview Modal
  const [previewFile, setPreviewFile] = React.useState<UploadedFile | null>(null)

  // State: Upload & Drag-and-drop
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Thông báo toast tự tắt
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Tải danh mục cây thư mục
  const loadFolderTree = React.useCallback(
    () =>
      api
        .getFolderTree()
        .then((res) => setFolderTree(res || []))
        .catch((err) => console.error("Lỗi khi tải cây thư mục:", err)),
    [],
  )

  // Bộ lọc đổi → bật loading ngay trong render (mẫu "lưu giá trị trước đó"), effect bên dưới nạp lại.
  const filesKey = `${selectedFolderId}|${activeTypeFilter}|${searchQuery}`
  const [prevFilesKey, setPrevFilesKey] = React.useState(filesKey)
  if (filesKey !== prevFilesKey) {
    setPrevFilesKey(filesKey)
    setLoadingFiles(true)
  }

  // Tải danh sách tệp tin — setState chỉ trong callback của promise.
  const fetchFiles = React.useCallback(
    () =>
      api
        .listFiles({
          folder_id: selectedFolderId,
          type: activeTypeFilter,
          search: searchQuery,
        })
        .then((res) => setFiles(res || []))
        .catch((err) => console.error("Lỗi khi tải files:", err))
        .finally(() => setLoadingFiles(false)),
    [selectedFolderId, activeTypeFilter, searchQuery],
  )

  const loadFiles = React.useCallback(() => {
    setLoadingFiles(true)
    return fetchFiles()
  }, [fetchFiles])

  // Initial Load (và nạp lại khi bộ lọc đổi)
  React.useEffect(() => {
    void loadFolderTree()
    void fetchFiles()
  }, [loadFolderTree, fetchFiles])

  // Suy ra từ selectedFolderId + folderTree trong render (không cần state/effect riêng).
  const selectedFolder = React.useMemo(
    () => (selectedFolderId === null ? null : findFolder(folderTree, selectedFolderId)),
    [selectedFolderId, folderTree],
  )

  // Toggle mở/đóng thư mục cây
  const toggleFolderExpand = (folderId: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }

  // Mở modal tạo thư mục
  const handleOpenCreateFolder = (parentId: string | number | null = null) => {
    setFolderModalMode("create")
    setEditingFolderId(null)
    setFolderFormName("")
    setFolderFormParentId(parentId ?? selectedFolderId)
    setFolderFormColor("#3b82f6")
    setShowFolderModal(true)
  }

  // Mở modal sửa thư mục
  const handleOpenEditFolder = (folder: MediaFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setFolderModalMode("edit")
    setEditingFolderId(folder.id)
    setFolderFormName(folder.name)
    setFolderFormParentId(folder.parent_id || null)
    setFolderFormColor(folder.color || "#3b82f6")
    setShowFolderModal(true)
  }

  // Lưu tạo/sửa thư mục
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderFormName.trim()) return

    try {
      if (folderModalMode === "create") {
        await api.createFolder(
          folderFormName.trim(),
          folderFormParentId,
          folderFormColor
        )
        showToast(`Đã tạo thư mục "${folderFormName.trim()}"`)
      } else if (editingFolderId) {
        await api.updateFolder(
          editingFolderId,
          folderFormName.trim(),
          folderFormParentId,
          folderFormColor
        )
        showToast(`Đã cập nhật thư mục "${folderFormName.trim()}"`)
      }
      setShowFolderModal(false)
      loadFolderTree()
      if (selectedFolderId) loadFiles()
    } catch (err: any) {
      alert(err.message || "Không thể lưu thư mục")
    }
  }

  // Xóa thư mục
  const handleDeleteFolder = async (folder: MediaFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm(`Bạn có chắc chắn muốn xóa thư mục "${folder.name}" và toàn bộ tệp bên trong?`)) {
      return
    }

    try {
      await api.deleteFolder(folder.id)
      showToast(`Đã xóa thư mục "${folder.name}"`)
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null)
      }
      loadFolderTree()
      loadFiles()
    } catch (err: any) {
      alert(err.message || "Xóa thư mục thất bại")
    }
  }

  // Tải tệp lên
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    setUploading(true)
    try {
      const filesArr = Array.from(fileList)
      for (const file of filesArr) {
        await api.uploadFileToFolder(file, selectedFolderId)
      }
      showToast(`Đã tải lên ${filesArr.length} tệp tin thành công`)
      loadFiles()
      loadFolderTree()
    } catch (err: any) {
      alert(err.message || "Tải tệp tin thất bại")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Kéo thả files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files)
    }
  }

  // Xóa tệp tin
  const handleDeleteFile = async (file: UploadedFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!confirm(`Bạn có chắc muốn xóa tệp "${file.original_name || file.filename}"?`)) {
      return
    }

    try {
      await api.deleteFile(file.id)
      showToast(`Đã xóa tệp "${file.original_name || file.filename}"`)
      if (previewFile?.id === file.id) setPreviewFile(null)
      loadFiles()
      loadFolderTree()
    } catch (err: any) {
      alert(err.message || "Xóa tệp thất bại")
    }
  }

  // Đổi tên tệp tin
  const handleOpenRenameFile = (file: UploadedFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setRenamingFile(file)
    setNewFileName(file.original_name || file.filename || "")
    setShowRenameFileModal(true)
  }

  const handleSaveRenameFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamingFile || !newFileName.trim()) return

    try {
      await api.renameFile(renamingFile.id, newFileName.trim())
      showToast(`Đã đổi tên tệp thành "${newFileName.trim()}"`)
      setShowRenameFileModal(false)
      loadFiles()
      if (previewFile?.id === renamingFile.id) {
        setPreviewFile({ ...previewFile, original_name: newFileName.trim() })
      }
    } catch (err: any) {
      alert(err.message || "Đổi tên tệp thất bại")
    }
  }

  // Copy tệp vào Clipboard
  const handleCopyFile = (file: UploadedFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setClipboard({ type: "copy", file })
    showToast(`Đã sao chép "${file.original_name || file.filename}". Chuột phải vào thư mục hoặc vùng trống để Dán.`)
  }

  // Cắt tệp (Move) vào Clipboard
  const handleCutFile = (file: UploadedFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setClipboard({ type: "move", file })
    showToast(`Đã cắt "${file.original_name || file.filename}". Chuột phải vào thư mục đích để Dán.`)
  }

  // Dán tệp từ Clipboard vào thư mục
  const handlePasteToFolder = async (folderId: string | number | null) => {
    if (!clipboard) return

    try {
      if (clipboard.type === "copy") {
        await api.copyFile(clipboard.file.id, folderId)
        showToast(`Đã nhân bản tệp vào thư mục đích`)
      } else {
        await api.moveFile(clipboard.file.id, folderId)
        showToast(`Đã di chuyển tệp vào thư mục đích`)
        setClipboard(null)
      }
      loadFiles()
      loadFolderTree()
    } catch (err: any) {
      alert(err.message || "Thao tác dán tệp thất bại")
    }
  }

  // Mở modal Di chuyển tệp
  const handleOpenMoveFile = (file: UploadedFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setMovingFile(file)
    setTargetFolderId(file.folder_id || null)
    setShowMoveFileModal(true)
  }

  // Xác nhận di chuyển tệp
  const handleConfirmMoveFile = async () => {
    if (!movingFile) return

    try {
      await api.moveFile(movingFile.id, targetFolderId)
      showToast(`Đã di chuyển tệp thành công`)
      setShowMoveFileModal(false)
      loadFiles()
      loadFolderTree()
    } catch (err: any) {
      alert(err.message || "Di chuyển tệp thất bại")
    }
  }

  // Sao chép link URL
  const handleCopyUrl = (url: string, fileId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    navigator.clipboard.writeText(url)
    setCopiedUrl(fileId)
    setTimeout(() => setCopiedUrl(null), 2000)
    showToast("Đã sao chép liên kết tệp vào bộ nhớ tạm")
  }

  // Helper định dạng icon theo MIME type
  const getFileIcon = (mimeType: string, className = "size-5") => {
    if (mimeType.startsWith("image/")) return <FileImage className={`${className} text-emerald-500`} />
    if (mimeType.startsWith("video/")) return <FileVideo className={`${className} text-purple-500`} />
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
      return <FileText className={`${className} text-blue-500`} />
    if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
      return <FileSpreadsheet className={`${className} text-amber-500`} />
    return <File className={`${className} text-slate-400`} />
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Render một mục thư mục đệ quy ở cột trái
  const renderTreeItem = (node: MediaFolder, level = 0) => {
    const isExpanded = expandedFolderIds.has(node.id)
    const isSelected = selectedFolderId === node.id
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id} className="select-none">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              onClick={() => setSelectedFolderId(node.id)}
              style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
              className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => toggleFolderExpand(node.id, e)}
                    className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : (
                  <span className="w-4 shrink-0" />
                )}

                <Folder
                  className="size-4 shrink-0"
                  style={{ color: isSelected ? "currentColor" : node.color || "#3b82f6" }}
                />

                <span className="truncate">{node.name}</span>
              </div>

              <div className="flex items-center gap-1">
                {node.files_count !== undefined && node.files_count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {node.files_count}
                  </span>
                )}
              </div>
            </div>
          </ContextMenuTrigger>

          <ContextMenuContent className="w-52 text-xs">
            <ContextMenuItem onClick={() => setSelectedFolderId(node.id)} className="cursor-pointer">
              <FolderOpen className="size-3.5 mr-2 text-primary" />
              Mở thư mục
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleOpenCreateFolder(node.id)} className="cursor-pointer">
              <FolderPlus className="size-3.5 mr-2 text-emerald-500" />
              Tạo thư mục con
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleOpenEditFolder(node)} className="cursor-pointer">
              <FolderPen className="size-3.5 mr-2 text-amber-500" />
              Đổi tên &amp; Màu sắc
            </ContextMenuItem>

            {clipboard && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handlePasteToFolder(node.id)} className="cursor-pointer">
                  <ClipboardPaste className="size-3.5 mr-2 text-blue-500" />
                  Dán tệp vào đây ({clipboard.type === "copy" ? "Nhân bản" : "Di chuyển"})
                </ContextMenuItem>
              </>
            )}

            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => handleDeleteFolder(node)}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3.5 mr-2" />
              Xóa thư mục
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              {node.children!.map((child) => renderTreeItem(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Danh sách các thư mục con trực tiếp của folder đang chọn
  const directChildFolders = selectedFolder
    ? selectedFolder.children || []
    : folderTree.filter((f) => !f.parent_id)

  return (
    <PageShell className="space-y-3">
      <PageHeader
        icon={Images}
        title={t("media.title")}
        description={t("media.description")}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold shadow-lg"
          >
            <Check className="size-3.5 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Split Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[660px] rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-xs overflow-hidden">
        {/* ========================================================= */}
        {/* CỘT TRÁI: FOLDER TREE EXPLORER (3 COLS)                     */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 border-r border-border/50 bg-muted/20 flex flex-col p-3 sm:p-4 space-y-4">
          {/* Header Explorer & Nút Thêm Folder */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                {t("media.folderTree")}
              </span>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleOpenCreateFolder(null)}
              className="h-7 text-xs gap-1 rounded-lg border-border/60 bg-background/80 hover:bg-muted shadow-2xs cursor-pointer"
            >
              <FolderPlus className="size-3.5 text-primary" />
              <span>{t("media.folder")}</span>
            </Button>
          </div>

          {/* Nhóm Lọc Nhanh (System Categories) */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setSelectedFolderId(null)
                setActiveTypeFilter("all")
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                selectedFolderId === null && activeTypeFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileBox className="size-4" />
                <span>{t("media.all")}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-4 px-1 font-mono">
                {files.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFolderId(null)
                setActiveTypeFilter("image")
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                selectedFolderId === null && activeTypeFilter === "image"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Images className="size-4 text-emerald-500" />
                <span>{t("media.images")}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFolderId(null)
                setActiveTypeFilter("document")
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                selectedFolderId === null && activeTypeFilter === "document"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-blue-500" />
                <span>{t("media.documents")}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedFolderId(null)
                setActiveTypeFilter("video")
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                selectedFolderId === null && activeTypeFilter === "video"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Film className="size-4 text-purple-500" />
                <span>{t("media.videos")}</span>
              </div>
            </button>
          </div>

          <div className="h-px bg-border/60 my-1" />

          {/* Cây Thư Mục Đệ Quy */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {folderTree.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                Chưa có thư mục nào. Bấm <strong>+ Thư mục</strong> để tạo mới.
              </div>
            ) : (
              folderTree.map((rootNode) => renderTreeItem(rootNode, 0))
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: WORKSPACE & FILE EXPLORER (9 COLS)                */}
        {/* ========================================================= */}
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`lg:col-span-9 flex flex-col p-4 sm:p-5 space-y-4 relative transition-colors ${
                isDragging ? "bg-primary/5 ring-2 ring-primary/40 ring-inset" : ""
              }`}
            >
              {/* Overlay Kéo Thả */}
              {isDragging && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm pointer-events-none rounded-2xl border-2 border-dashed border-primary">
                  <UploadCloud className="size-16 text-primary animate-bounce mb-3" />
                  <p className="text-base font-bold text-foreground">Thả tập tin vào đây để tải lên ngay</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tập tin sẽ được đưa vào thư mục:{" "}
                    <strong className="text-primary">{selectedFolder ? selectedFolder.name : "Thư mục gốc"}</strong>
                  </p>
                </div>
              )}

              {/* Top Navigation & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                {/* Breadcrumb Path */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto py-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFolderId(null)}
                    className={`hover:text-primary transition-colors flex items-center gap-1 font-medium ${
                      selectedFolderId === null ? "text-foreground font-bold" : ""
                    }`}
                  >
                    <HardDrive className="size-3.5" />
                    <span>Media Root</span>
                  </button>

                  {selectedFolder && (
                    <>
                      <ChevronRight className="size-3 text-muted-foreground/60" />
                      <span className="text-foreground font-semibold flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: selectedFolder.color || "#3b82f6" }}
                        />
                        <span>{selectedFolder.name}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Actions: Search, Filter, ViewMode, Upload */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Box */}
                  <div className="relative w-44 sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("media.searchPlaceholder")}
                      data-testid="media-search"
                      className="h-8 pl-8 pr-7 text-xs rounded-lg bg-background/80"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/40">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        viewMode === "grid" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Dạng lưới thẻ"
                    >
                      <LayoutGrid className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        viewMode === "list" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Dạng bảng danh sách"
                    >
                      <List className="size-3.5" />
                    </button>
                  </div>

                  {/* Upload Input & Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUploadFiles(e.target.files)}
                  />
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <UploadCloud className="size-3.5" />
                    <span>{uploading ? "Đang tải..." : t("media.upload")}</span>
                  </Button>
                </div>
              </div>

              {/* Clipboard Active Bar if any */}
              {clipboard && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2 text-foreground">
                    <Copy className="size-3.5 text-primary" />
                    <span>
                      Đang {clipboard.type === "copy" ? "sao chép" : "cắt"}:{" "}
                      <strong>{clipboard.file.original_name || clipboard.file.filename}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      onClick={() => handlePasteToFolder(selectedFolderId)}
                      className="h-6 text-[11px] font-semibold gap-1"
                    >
                      <ClipboardPaste className="size-3" />
                      Dán vào đây
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setClipboard(null)}
                      className="h-6 text-[11px]"
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* SUBFOLDERS SECTION (Hỗ trợ cả Grid và List)               */}
              {/* ========================================================= */}
              {directChildFolders.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                      Thư mục ({directChildFolders.length})
                    </h4>
                    <span className="text-[10px] text-muted-foreground">Chuột phải để thêm, sửa, xóa, dán tệp</span>
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {directChildFolders.map((subfolder) => (
                        <ContextMenu key={subfolder.id}>
                          <ContextMenuTrigger asChild>
                            <div
                              onClick={() => setSelectedFolderId(subfolder.id)}
                              className="group flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-primary/40 transition-all cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Folder className="size-5 shrink-0" style={{ color: subfolder.color || "#3b82f6" }} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                                    {subfolder.name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{subfolder.files_count || 0} tệp</p>
                                </div>
                              </div>
                            </div>
                          </ContextMenuTrigger>

                          <ContextMenuContent className="w-48 text-xs">
                            <ContextMenuItem onClick={() => setSelectedFolderId(subfolder.id)} className="cursor-pointer">
                              <FolderOpen className="size-3.5 mr-2 text-primary" />
                              Mở thư mục
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleOpenCreateFolder(subfolder.id)} className="cursor-pointer">
                              <FolderPlus className="size-3.5 mr-2 text-emerald-500" />
                              Tạo thư mục con
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleOpenEditFolder(subfolder)} className="cursor-pointer">
                              <FolderPen className="size-3.5 mr-2 text-amber-500" />
                              Đổi tên &amp; Màu
                            </ContextMenuItem>

                            {clipboard && (
                              <>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => handlePasteToFolder(subfolder.id)} className="cursor-pointer">
                                  <ClipboardPaste className="size-3.5 mr-2 text-blue-500" />
                                  Dán tệp vào đây
                                </ContextMenuItem>
                              </>
                            )}

                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() => handleDeleteFolder(subfolder)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Xóa thư mục
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </div>
                  ) : (
                    /* Dạng Danh Sách Cho Thư Mục */
                    <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
                      <div className="divide-y divide-border/40">
                        {directChildFolders.map((subfolder) => (
                          <ContextMenu key={subfolder.id}>
                            <ContextMenuTrigger asChild>
                              <div
                                onClick={() => setSelectedFolderId(subfolder.id)}
                                className="flex items-center justify-between p-2.5 px-3 hover:bg-muted/30 transition-colors cursor-pointer text-xs"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Folder className="size-4 shrink-0" style={{ color: subfolder.color || "#3b82f6" }} />
                                  <span className="font-semibold text-foreground truncate">{subfolder.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground font-mono text-[11px]">
                                  <span>{subfolder.files_count || 0} tệp</span>
                                  <ChevronRight className="size-3.5" />
                                </div>
                              </div>
                            </ContextMenuTrigger>

                            <ContextMenuContent className="w-48 text-xs">
                              <ContextMenuItem onClick={() => setSelectedFolderId(subfolder.id)} className="cursor-pointer">
                                <FolderOpen className="size-3.5 mr-2 text-primary" />
                                Mở thư mục
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleOpenCreateFolder(subfolder.id)} className="cursor-pointer">
                                <FolderPlus className="size-3.5 mr-2 text-emerald-500" />
                                Tạo thư mục con
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleOpenEditFolder(subfolder)} className="cursor-pointer">
                                <FolderPen className="size-3.5 mr-2 text-amber-500" />
                                Đổi tên &amp; Màu
                              </ContextMenuItem>
                              {clipboard && (
                                <>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem onClick={() => handlePasteToFolder(subfolder.id)} className="cursor-pointer">
                                    <ClipboardPaste className="size-3.5 mr-2 text-blue-500" />
                                    Dán tệp vào đây
                                  </ContextMenuItem>
                                </>
                              )}
                              <ContextMenuSeparator />
                              <ContextMenuItem
                                onClick={() => handleDeleteFolder(subfolder)}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                Xóa thư mục
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* FILES EXPLORER SECTION (Hỗ trợ cả Grid và List)           */}
              {/* ========================================================= */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                    Tập tin ({files.length})
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Chuột phải lên tệp để xem thao tác</span>
                </div>

                {loadingFiles ? (
                  <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                    Đang tải dữ liệu tệp tin...
                  </div>
                ) : files.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-52 flex flex-col items-center justify-center border-2 border-dashed border-border/70 rounded-2xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all"
                  >
                    <UploadCloud className="size-9 text-muted-foreground mb-2" />
                    <p className="text-xs font-semibold text-foreground">{t("media.empty")}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("media.emptyHint")}
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  /* Dạng Grid Thẻ */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {files.map((file) => {
                      const isImage = file.mime_type.startsWith("image/")
                      const displayName = file.original_name || file.filename || "file"
                      const displayUrl = file.url || file.file_url

                      return (
                        <ContextMenu key={file.id}>
                          <ContextMenuTrigger asChild>
                            <div
                              onClick={() => setPreviewFile(file)}
                              className="group relative flex flex-col rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden cursor-pointer"
                            >
                              {/* Preview Area */}
                              <div className="h-28 w-full bg-muted/40 flex items-center justify-center relative overflow-hidden">
                                {isImage && displayUrl ? (
                                  <img
                                    src={displayUrl}
                                    alt={displayName}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="p-4">{getFileIcon(file.mime_type, "size-10")}</div>
                                )}
                              </div>

                              {/* File Details */}
                              <div className="p-2.5">
                                <p className="text-xs font-semibold text-foreground truncate" title={displayName}>
                                  {displayName}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                  <span>{formatBytes(file.size || file.file_size)}</span>
                                  <span className="font-mono">
                                    {new Date(file.created_at).toLocaleDateString("vi-VN")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </ContextMenuTrigger>

                          <ContextMenuContent className="w-52 text-xs">
                            <ContextMenuItem onClick={() => setPreviewFile(file)} className="cursor-pointer">
                              <Eye className="size-3.5 mr-2 text-primary" />
                              Xem chi tiết
                            </ContextMenuItem>
                            {displayUrl && (
                              <ContextMenuItem onClick={() => handleCopyUrl(displayUrl, file.id)} className="cursor-pointer">
                                <Copy className="size-3.5 mr-2 text-emerald-500" />
                                Sao chép liên kết URL
                              </ContextMenuItem>
                            )}
                            <ContextMenuItem onClick={() => handleOpenRenameFile(file)} className="cursor-pointer">
                              <Edit2 className="size-3.5 mr-2 text-amber-500" />
                              Đổi tên tệp tin
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => handleCopyFile(file)} className="cursor-pointer">
                              <Copy className="size-3.5 mr-2 text-blue-500" />
                              Sao chép (Copy)
                              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleCutFile(file)} className="cursor-pointer">
                              <Scissors className="size-3.5 mr-2 text-orange-500" />
                              Cắt (Cut / Move)
                              <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleOpenMoveFile(file)} className="cursor-pointer">
                              <MoveRight className="size-3.5 mr-2 text-indigo-500" />
                              Di chuyển tới thư mục...
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              onClick={() => handleDeleteFile(file)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Xóa tệp tin
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })}
                  </div>
                ) : (
                  /* Dạng Bảng Danh Sách */
                  <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground font-mono text-[11px]">
                        <tr>
                          <th className="p-3">Tên Tệp Tin</th>
                          <th className="p-3">Định Dạng</th>
                          <th className="p-3">Dung Lượng</th>
                          <th className="p-3">Ngày Tải Lên</th>
                          <th className="p-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {files.map((file) => {
                          const displayName = file.original_name || file.filename || "file"
                          const displayUrl = file.url || file.file_url

                          return (
                            <ContextMenu key={file.id}>
                              <ContextMenuTrigger asChild>
                                <tr
                                  onClick={() => setPreviewFile(file)}
                                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                                >
                                  <td className="p-3 flex items-center gap-2.5 font-medium max-w-xs truncate">
                                    {getFileIcon(file.mime_type)}
                                    <span className="truncate">{displayName}</span>
                                  </td>
                                  <td className="p-3 text-muted-foreground font-mono text-[11px]">
                                    {file.mime_type}
                                  </td>
                                  <td className="p-3 text-muted-foreground font-mono text-[11px]">
                                    {formatBytes(file.size || file.file_size)}
                                  </td>
                                  <td className="p-3 text-muted-foreground text-[11px]">
                                    {new Date(file.created_at).toLocaleString("vi-VN")}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {displayUrl && (
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopyUrl(displayUrl, file.id, e)}
                                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                          title="Sao chép link"
                                        >
                                          {copiedUrl === file.id ? (
                                            <Check className="size-3.5 text-emerald-500" />
                                          ) : (
                                            <Copy className="size-3.5" />
                                          )}
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenRenameFile(file, e)}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                        title="Đổi tên"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenMoveFile(file, e)}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                        title="Di chuyển"
                                      >
                                        <MoveRight className="size-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteFile(file, e)}
                                        className="p-1 rounded hover:bg-destructive/15 text-destructive"
                                        title="Xóa"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              </ContextMenuTrigger>

                              <ContextMenuContent className="w-52 text-xs">
                                <ContextMenuItem onClick={() => setPreviewFile(file)} className="cursor-pointer">
                                  <Eye className="size-3.5 mr-2 text-primary" />
                                  Xem chi tiết
                                </ContextMenuItem>
                                {displayUrl && (
                                  <ContextMenuItem onClick={() => handleCopyUrl(displayUrl, file.id)} className="cursor-pointer">
                                    <Copy className="size-3.5 mr-2 text-emerald-500" />
                                    Sao chép liên kết URL
                                  </ContextMenuItem>
                                )}
                                <ContextMenuItem onClick={() => handleOpenRenameFile(file)} className="cursor-pointer">
                                  <Edit2 className="size-3.5 mr-2 text-amber-500" />
                                  Đổi tên tệp tin
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem onClick={() => handleCopyFile(file)} className="cursor-pointer">
                                  <Copy className="size-3.5 mr-2 text-blue-500" />
                                  Sao chép (Copy)
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleCutFile(file)} className="cursor-pointer">
                                  <Scissors className="size-3.5 mr-2 text-orange-500" />
                                  Cắt (Cut / Move)
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleOpenMoveFile(file)} className="cursor-pointer">
                                  <MoveRight className="size-3.5 mr-2 text-indigo-500" />
                                  Di chuyển tới thư mục...
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  onClick={() => handleDeleteFile(file)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-3.5 mr-2" />
                                  Xóa tệp tin
                                </ContextMenuItem>
                              </ContextMenuContent>
                            </ContextMenu>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </ContextMenuTrigger>

          {/* Context Menu Cho Toàn Bộ Vùng Trống (Canvas Background) */}
          <ContextMenuContent className="w-52 text-xs">
            <ContextMenuItem onClick={() => handleOpenCreateFolder(selectedFolderId)} className="cursor-pointer">
              <FolderPlus className="size-3.5 mr-2 text-emerald-500" />
              Tạo thư mục mới
            </ContextMenuItem>
            <ContextMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
              <UploadCloud className="size-3.5 mr-2 text-primary" />
              Tải tệp tin lên đây
            </ContextMenuItem>

            {clipboard && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => handlePasteToFolder(selectedFolderId)} className="cursor-pointer">
                  <ClipboardPaste className="size-3.5 mr-2 text-blue-500" />
                  Dán tệp ({clipboard.type === "copy" ? "Nhân bản" : "Di chuyển"})
                </ContextMenuItem>
              </>
            )}

            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="cursor-pointer">
              {viewMode === "grid" ? <List className="size-3.5 mr-2" /> : <LayoutGrid className="size-3.5 mr-2" />}
              Đổi sang dạng {viewMode === "grid" ? "Danh sách" : "Lưới thẻ"}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => { loadFolderTree(); loadFiles(); }} className="cursor-pointer">
              <RefreshCw className="size-3.5 mr-2 text-muted-foreground" />
              Làm mới trang
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>

      {/* Modal: Tạo / Chỉnh Sửa Thư Mục */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="size-4 text-primary" />
              {folderModalMode === "create" ? "Tạo Thư Mục Mới" : "Chỉnh Sửa Thư Mục"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {folderModalMode === "create"
                ? "Thư mục sẽ được tạo trong danh mục phân cấp hiện tại."
                : "Thay đổi tên hoặc màu sắc nhận diện của thư mục."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFolder} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Tên thư mục *</label>
              <Input
                required
                placeholder="Ví dụ: Hình ảnh sản phẩm, Tài liệu 2026..."
                value={folderFormName}
                onChange={(e) => setFolderFormName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Thư mục cha (Parent)</label>
              <select
                value={folderFormParentId ?? ""}
                onChange={(e) => setFolderFormParentId(e.target.value || null)}
                className="w-full h-9 rounded-md border border-border/70 bg-background px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="">-- Media Root (Thư mục gốc) --</option>
                {folderTree.map((f) => (
                  <option key={f.id} value={f.id} disabled={f.id === editingFolderId}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Màu nhận diện</label>
              <div className="flex items-center gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setFolderFormColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`size-6 rounded-full border-2 transition-transform ${
                      folderFormColor === c.hex ? "scale-115 border-foreground shadow-xs" : "border-transparent opacity-80"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFolderModal(false)}
                className="h-8 text-xs"
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-semibold">
                {folderModalMode === "create" ? "Tạo Thư Mục" : "Lưu Thay Đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Đổi Tên Tệp Tin */}
      <Dialog open={showRenameFileModal} onOpenChange={setShowRenameFileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit2 className="size-4 text-primary" />
              Đổi Tên Tệp Tin
            </DialogTitle>
            <DialogDescription className="text-xs">
              Nhập tên hiển thị mới cho tệp tin này.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRenameFile} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Tên tệp tin *</label>
              <Input
                required
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRenameFileModal(false)}
                className="h-8 text-xs"
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-semibold">
                Lưu Tên Mới
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Di Chuyển Tệp Tin Sang Thư Mục Khác */}
      <Dialog open={showMoveFileModal} onOpenChange={setShowMoveFileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MoveRight className="size-4 text-primary" />
              Di Chuyển Tệp Tin
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chọn thư mục đích bạn muốn chuyển tệp{" "}
              <strong>{movingFile?.original_name || movingFile?.filename}</strong> vào.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Chọn thư mục đích</label>
              <select
                value={targetFolderId ?? ""}
                onChange={(e) => setTargetFolderId(e.target.value || null)}
                className="w-full h-9 rounded-md border border-border/70 bg-background px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="">-- Media Root (Thư mục gốc) --</option>
                {folderTree.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMoveFileModal(false)}
              className="h-8 text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmMoveFile}
              className="h-8 text-xs font-semibold"
            >
              Xác Nhận Di Chuyển
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Preview Tệp Tin & Thông Tin Chi Tiết */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base truncate pr-6">
              {previewFile && getFileIcon(previewFile.mime_type, "size-4")}
              <span className="truncate">{previewFile?.original_name || previewFile?.filename}</span>
            </DialogTitle>
          </DialogHeader>

          {previewFile && (
            <div className="space-y-4 py-2">
              {/* Media Container */}
              <div className="h-64 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center overflow-hidden">
                {previewFile.mime_type.startsWith("image/") && (previewFile.url || previewFile.file_url) ? (
                  <img
                    src={previewFile.url || previewFile.file_url}
                    alt={previewFile.original_name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {getFileIcon(previewFile.mime_type, "size-16")}
                    <span className="text-xs">Không hỗ trợ xem trước định dạng này</span>
                  </div>
                )}
              </div>

              {/* Meta Specs */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-xl border border-border/50">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono block">Định dạng</span>
                  <span className="font-semibold text-foreground">{previewFile.mime_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono block">Dung lượng</span>
                  <span className="font-semibold text-foreground">
                    {formatBytes(previewFile.size || previewFile.file_size)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono block">Ngày tải lên</span>
                  <span className="font-semibold text-foreground">
                    {new Date(previewFile.created_at).toLocaleString("vi-VN")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-mono block">Lưu trữ</span>
                  <span className="font-semibold text-foreground">{previewFile.disk || "local"}</span>
                </div>
              </div>

              <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteFile(previewFile)}
                  className="h-8 text-xs"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Xóa tệp
                </Button>

                <div className="flex items-center gap-2">
                  {(previewFile.url || previewFile.file_url) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl((previewFile.url || previewFile.file_url)!, previewFile.id)}
                      className="h-8 text-xs"
                    >
                      {copiedUrl === previewFile.id ? (
                        <Check className="size-3.5 mr-1 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5 mr-1" />
                      )}
                      Sao chép link
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setPreviewFile(null)}
                    className="h-8 text-xs"
                  >
                    Đóng
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
