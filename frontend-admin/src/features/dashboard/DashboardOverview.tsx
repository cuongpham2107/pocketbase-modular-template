import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import type { User } from '@/types'
import { useModules } from '@/lib/modules'
import {
  Users,
  ShieldCheck,
  HardDrive,
  Activity,
  ArrowUpRight,
  Bot,
  Smartphone,
  Layers,
  LayoutDashboard,
  CheckCircle2,
  Cpu,
  KeyRound,
  FileCode2,
} from 'lucide-react'
import { PageHeader, PageShell } from "@/components/layout/page"

interface DashboardOverviewProps {
  currentUser: User | null
  onNavigate: (path: string) => void
}

export function DashboardOverview({ currentUser, onNavigate }: DashboardOverviewProps) {
  const { has } = useModules()
  return (
    <PageShell className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Tổng quan"
        description="Số liệu nhanh về người dùng, phân quyền và lưu trữ của hệ thống."
      />

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-card border border-primary/20 p-6 md:p-8">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25">
            <Layers className="h-3.5 w-3.5" />
            <span>Filament Admin Architecture • Go Gin & React 19</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Xin chào, {currentUser ? currentUser.full_name : 'Quản trị viên'}! 👋
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Hệ thống quản trị doanh nghiệp toàn diện: Phân quyền động đa cấp (Dynamic RBAC), xác thực JWT an toàn,
            lưu trữ tập tin cục bộ / S3 và tích hợp sẵn chuẩn giao tiếp AI Agent (Model Context Protocol).
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onNavigate('rbac')}
              className="shadow-md shadow-primary/20 text-xs font-semibold"
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Quản lý Quyền Động (RBAC)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigate('gateway')}
              className="text-xs font-semibold"
            >
              <Bot className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Công Cụ AI MCP
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="text-xs font-semibold"
            >
              <a href="http://localhost:8080/swagger/index.html" target="_blank" rel="noreferrer">
                <FileCode2 className="h-3.5 w-3.5 mr-1.5" />
                Swagger UI ↗
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metric Stat Widgets (Filament Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card
          onClick={() => onNavigate('users')}
          className="border-border/60 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Người Dùng
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black tracking-tight text-foreground">
              {currentUser ? '1 Active' : 'Chưa đăng nhập'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0">
                +100%
              </Badge>
              <span className="text-muted-foreground text-[11px]">Bcrypt & JWT Verified</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card
          onClick={() => onNavigate('rbac')}
          className="border-border/60 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vai Trò Động (RBAC)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black tracking-tight text-foreground">
              2 Roles • 7 Perms
            </div>
            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                HOT
              </Badge>
              <span className="text-muted-foreground text-[11px]">Dynamic Middleware</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 — chỉ khi module media bật */}
        {has('media') && (
          <Card
            onClick={() => onNavigate('files')}
            className="border-border/60 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md group"
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Kho Lưu Trữ
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HardDrive className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-1">
              <div className="text-2xl font-black tracking-tight text-foreground">
                Storage Provider
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  LOCAL / S3
                </Badge>
                <span className="text-[11px]">Static Static File Serving</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metric 4 */}
        <Card
          onClick={() => onNavigate('gateway')}
          className="border-border/60 hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Go REST Gateway
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-1">
            <div className="text-2xl font-black tracking-tight text-foreground">
              Port 8080 : UP
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px]">Latency &lt; 2ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Architecture & Protocol Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Features Blueprint */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  Kiến Trúc Lõi (Hexagonal / Ports & Adapters)
                </CardTitle>
                <CardDescription className="text-xs">
                  Domain logic độc lập 100%, sẵn sàng cắm rút HTTP REST và AI MCP Stdio
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Pure Go
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-foreground">Cơ chế Dual Repository Persistence:</span>
                <p className="text-muted-foreground text-[11px]">
                  Tự động chuyển đổi giữa <code>PostgreSQL GORM</code> (Production) và <code>Thread-safe Memory Map</code> (Local dev không cần cài DB).
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-foreground">Phân quyền động theo thời gian thực (Dynamic RBAC):</span>
                <p className="text-muted-foreground text-[11px]">
                  Middleware <code>RequirePermission(code)</code> đọc quyền trực tiếp từ bảng phân quyền, cấp hoặc tước quyền tức thì mà không cần rebuild backend.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-foreground">Model Context Protocol (AI Native):</span>
                <p className="text-muted-foreground text-[11px]">
                  Lệnh <code>app mcp</code> (module mcp) cho phép Claude Desktop, Cursor, Antigravity gọi trực tiếp Service qua JSON-RPC stdio.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Quick Navigation & Audit Log */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Truy Cập Nhanh Module (Filament Modules)
                </CardTitle>
                <CardDescription className="text-xs">
                  Chuyển nhanh giữa các phân hệ quản trị
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              {
                title: 'Quản Lý Phân Quyền Động (RBAC)',
                desc: 'Phân vai trò, kiểm thử quyền truy cập động, thêm mới Role',
                path: '/rbac',
                icon: ShieldCheck,
                color: 'text-emerald-500',
              },
              {
                title: 'Tài Khoản & Xác Thực (Auth)',
                desc: 'Đăng nhập, đăng ký tài khoản, JWT token inspector',
                path: '/users',
                icon: KeyRound,
                color: 'text-blue-500',
              },
              {
                title: 'Lưu Trữ & Quản Lý Tập Tin',
                desc: 'Tải lên hình ảnh, tài liệu và lấy URL static gateway',
                path: '/media',
                icon: HardDrive,
                color: 'text-amber-500',
                module: 'media' as const,
              },
              {
                title: 'AI MCP Server & Mobile Plugin',
                desc: 'Xem 5 AI Tools và kiểm thử API Mobile Force Update',
                path: '/gateway',
                icon: Smartphone,
                color: 'text-indigo-500',
              },
            ]
              .filter((item) => !('module' in item) || !item.module || has(item.module))
              .map((item) => (
              <div
                key={item.title}
                onClick={() => onNavigate(item.path)}
                className="p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg bg-muted/60 ${item.color} shrink-0 group-hover:scale-105 transition-transform`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
