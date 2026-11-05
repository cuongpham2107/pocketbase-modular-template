import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { pb, getCurrentUser, logout } from "@/lib/pocketbase"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  LogOut,
  ShoppingBag,
  Clock,
  CheckCircle,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Zap,
  TrendingUp,
} from "lucide-react"

interface Order {
  id: string
  code?: string
  customer?: string
  total?: number
  status?: string
  created?: string
}

export function DashboardPage() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Form custom action
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState("")
  const [newTotal, setNewTotal] = useState("250000")

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      // Thử lấy danh sách order từ PocketBase
      const records = await pb.collection("orders").getList<Order>(1, 50, {
        sort: "-created",
      })
      setOrders(records.items)
    } catch {
      // Nếu collection chưa được tạo trong pb_data
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // Gọi Custom Backend Endpoint: POST /api/custom/orders/create
  const handleCustomCreateOrder = async (customerName: string, amount: number) => {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const response = await fetch("/api/custom/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          customer: customerName || "Khách hàng vãng lai",
          total: Number(amount) || 100000,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo đơn hàng qua Custom API")
      }

      setActionMessage({
        text: `Đã thực hiện Custom Action thành công! Đơn hàng: ${data.order?.code || data.order?.id}`,
        type: "success",
      })
      setShowCreateModal(false)
      setNewCustomer("")
      await fetchOrders()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi gọi Custom Action"
      setActionMessage({ text: msg, type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  // Gọi Custom Backend Endpoint: POST /api/custom/orders/:id/confirm
  const handleCustomConfirmOrder = async (orderId: string) => {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const response = await fetch(`/api/custom/orders/${orderId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: pb.authStore.token,
        },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Không thể xác nhận đơn qua Custom API")
      }

      setActionMessage({
        text: `Duyệt đơn hàng thành công qua Custom Action!`,
        type: "success",
      })
      await fetchOrders()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi duyệt đơn"
      setActionMessage({ text: msg, type: "error" })
    } finally {
      setActionLoading(false)
    }
  }

  // Thống kê
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const pendingOrders = orders.filter((o) => (o.status || "").toLowerCase() === "pending")
  const confirmedOrders = orders.filter((o) => (o.status || "").toLowerCase() === "confirmed")

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow">
              PB
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Business Admin Portal</h1>
              <p className="text-xs text-muted-foreground">PocketBase Custom Business Logic</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Link to PocketBase Developer Studio */}
            <a
              href="/_/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
              title="Mở PocketBase Studio gốc để quản trị schema/database"
            >
              Dev Studio (DB Gốc)
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="text-right hidden md:block">
              <div className="text-sm font-medium">{currentUser?.name || currentUser?.email}</div>
              <div className="text-xs text-muted-foreground">Admin / Quản trị viên</div>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8 sm:px-6 space-y-6">
        {/* Banner notification */}
        {actionMessage && (
          <div
            className={`rounded-lg border p-4 text-sm font-medium transition-all ${
              actionMessage.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Action Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Quản lý Đơn hàng & Nghiệp vụ</h2>
            <p className="text-sm text-muted-foreground">
              Bảng điều khiển kết nối trực tiếp Go backend APIs và Custom Business Actions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>

            <Button
              size="sm"
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => handleCustomCreateOrder("Đơn test nhanh", 350000)}
              disabled={actionLoading}
            >
              <Zap className="h-4 w-4" />
              ⚡ Test Custom Action (Tạo nhanh)
            </Button>

            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setShowCreateModal(true)}
              disabled={actionLoading}
            >
              <PlusCircle className="h-4 w-4" />
              Tạo đơn hàng mới
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số đơn hàng</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground">Đơn ghi nhận trong hệ thống</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doanh thu dự kiến</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">Dựa trên tất cả đơn hàng</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ duyệt (Pending)</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingOrders.length}</div>
              <p className="text-xs text-muted-foreground">Cần xử lý qua Custom Action</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{confirmedOrders.length}</div>
              <p className="text-xs text-muted-foreground">Đã xác nhận & bàn giao</p>
            </CardContent>
          </Card>
        </div>

        {/* Modal tạo đơn hàng tuỳ chọn */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Custom Action: Tạo đơn hàng
                </CardTitle>
                <CardDescription>
                  Gửi dữ liệu qua Go endpoint <code>/api/custom/orders/create</code> (có transaction & validation).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custName">Tên khách hàng</Label>
                  <Input
                    id="custName"
                    placeholder="VD: Công ty TNHH ABC"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderAmt">Tổng tiền (VNĐ)</Label>
                  <Input
                    id="orderAmt"
                    type="number"
                    value={newTotal}
                    onChange={(e) => setNewTotal(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 p-6 pt-0">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={() => handleCustomCreateOrder(newCustomer, Number(newTotal))}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận tạo"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Danh sách đơn hàng gần đây</CardTitle>
                <CardDescription>
                  Các đơn hàng được quản lý bởi PocketBase database và các Custom Hooks.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                Đang tải dữ liệu đơn hàng...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <h3 className="mt-3 text-base font-semibold">Chưa có đơn hàng nào</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                  Hãy bấm nút &ldquo;⚡ Test Custom Action&rdquo; bên trên để tạo đơn hàng đầu tiên qua endpoint Go backend!
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={() => handleCustomCreateOrder("Khách hàng khởi tạo", 150000)}
                    disabled={actionLoading}
                    className="gap-1.5"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Tạo đơn hàng mẫu ngay
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Mã đơn</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Tổng tiền</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3 text-right">Hành động Custom</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => {
                      const isPending = (order.status || "").toLowerCase() === "pending"
                      return (
                        <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-xs">
                            {order.code || order.id}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {order.customer || "Khách lẻ"}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {new Intl.NumberFormat("vi-VN", {
                              style: "currency",
                              currency: "VND",
                            }).format(order.total || 0)}
                          </td>
                          <td className="px-4 py-3">
                            {isPending ? (
                              <Badge variant="warning">Chờ xử lý</Badge>
                            ) : (
                              <Badge variant="success">Đã duyệt</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {order.created ? new Date(order.created).toLocaleString("vi-VN") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleCustomConfirmOrder(order.id)}
                                disabled={actionLoading}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Duyệt đơn
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
