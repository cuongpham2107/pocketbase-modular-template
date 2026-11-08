import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import {
  Server,
  Database,
  Smartphone,
  Bot,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Code2,
  Play,
  Terminal,
  Activity,
  Sparkles,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { PageHeader, PageShell } from "@/components/layout/page"
import { useTranslation } from "react-i18next"
import { useModules } from "@/lib/modules"

interface McpTool {
  name: string
  description: string
  inputSchema: {
    type?: string
    properties?: Record<string, { type?: string; description?: string }>
    required?: string[]
  }
}

/** JSON tham số mẫu cho một công cụ MCP, suy từ inputSchema. */
function defaultArgsFor(tool: McpTool): string {
  const props = tool.inputSchema?.properties || {}
  const sample: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(props)) {
    if (prop.type === 'number') sample[key] = 1
    else if (prop.type === 'string') {
      if (key.includes('email')) sample[key] = 'admin@example.com'
      else if (key.includes('password')) sample[key] = 'secret123'
      else if (key.includes('permission')) sample[key] = 'users:view'
      else if (key.includes('filename')) sample[key] = 'sample.txt'
      else if (key.includes('base64')) sample[key] = 'SGVsbG8gTUdQIQ=='
      else sample[key] = 'test'
    } else {
      sample[key] = ''
    }
  }
  return JSON.stringify(sample, null, 2)
}

export function GatewayStatus() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'mcp' | 'gateway' | 'mobile'>('mcp')
  const { has } = useModules()
  // Tab của module đang tắt thì rơi về tab REST API (luôn có).
  const tab =
    (activeTab === 'mcp' && !has('mcp')) || (activeTab === 'mobile' && !has('mobile'))
      ? 'gateway'
      : activeTab
  const [gatewayData, setGatewayData] = useState<Record<string, unknown> | null>(null)
  const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null)
  const [readyData, setReadyData] = useState<Record<string, unknown> | null>(null)
  // true ngay từ đầu: effect mount nạp trạng thái ngay.
  const [loading, setLoading] = useState(true)

  // MCP State
  const [tools, setTools] = useState<McpTool[]>([])
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null)
  const [argsJson, setArgsJson] = useState('{}')
  const [executing, setExecuting] = useState(false)
  const [execResult, setExecResult] = useState<unknown>(null)
  const [execLatency, setExecLatency] = useState<number | null>(null)
  const [execError, setExecError] = useState<string | null>(null)
  const [copiedCmd, setCopiedCmd] = useState(false)

  // Mobile App Check Tester
  const [mobilePlatform, setMobilePlatform] = useState<'android' | 'ios'>('android')
  const [mobileVersion, setMobileVersion] = useState('1.0.0')
  const [mobileResult, setMobileResult] = useState<Record<string, unknown> | null>(null)
  const [checkingMobile, setCheckingMobile] = useState(false)

  // Phần bất đồng bộ (setState trong callback promise). `currentTool` = công cụ đang chọn;
  // null → tự chọn công cụ đầu tiên như lần nạp đầu.
  const loadStatus = useCallback(
    (currentTool: McpTool | null) =>
      Promise.all([
        api.getGatewayRoot().catch((err) => ({ error: err.message })),
        api.checkHealth().catch((err) => ({ error: err.message })),
        api.checkReady().catch((err) => ({ error: err.message })),
        api.getMcpTools().catch(() => ({ tools: [], count: 0 })),
      ])
        .then(([root, health, ready, mcpRes]) => {
          setGatewayData(root)
          setHealthData(health)
          setReadyData(ready)
          if (mcpRes.tools && mcpRes.tools.length > 0) {
            setTools(mcpRes.tools)
            if (!currentTool) {
              const first = mcpRes.tools[0]
              setSelectedTool(first)
              setArgsJson(defaultArgsFor(first))
            }
          }
        })
        .finally(() => setLoading(false)),
    [],
  )

  const fetchStatus = () => {
    setLoading(true)
    return loadStatus(selectedTool)
  }

  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool)
    setArgsJson(defaultArgsFor(tool))
    setExecResult(null)
    setExecError(null)
    setExecLatency(null)
  }

  const handleExecuteTool = async () => {
    if (!selectedTool) return
    setExecuting(true)
    setExecError(null)
    setExecResult(null)
    const startTime = performance.now()
    try {
      let parsedArgs = {}
      try {
        parsedArgs = JSON.parse(argsJson)
      } catch {
        throw new Error('JSON tham số không hợp lệ. Vui lòng kiểm tra lại cú pháp.')
      }

      const res = await api.executeMcpTool(selectedTool.name, parsedArgs)
      setExecResult(res.result)
    } catch (err: unknown) {
      setExecError(err instanceof Error ? err.message : 'Lỗi khi thực thi công cụ MCP')
    } finally {
      setExecLatency(Math.round(performance.now() - startTime))
      setExecuting(false)
    }
  }

  useEffect(() => {
    void loadStatus(null)
  }, [loadStatus])

  const handleCheckMobileVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    setCheckingMobile(true)
    try {
      const res = await api.checkMobileVersion(mobilePlatform, mobileVersion)
      setMobileResult(res)
    } catch (err: unknown) {
      setMobileResult({ error: err instanceof Error ? err.message : 'Lỗi gọi API Mobile' })
    } finally {
      setCheckingMobile(false)
    }
  }

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('go run ./cmd mcp')
    setCopiedCmd(true)
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  const dbInfo = healthData?.database as Record<string, string> | undefined

  return (
    <PageShell className="space-y-6">
      <PageHeader
        icon={Server}
        title={t("gateway.title")}
        description={t("gateway.description")}
      />

      {/* 3 Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gateway Health */}
        <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Server className="h-4 w-4 text-primary" />
                Go REST Gateway
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  readyData?.status === 'ready'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]'
                    : 'bg-destructive/10 text-destructive border-destructive/20 text-[10px]'
                }
              >
                {readyData?.status === 'ready' ? 'READY' : 'NOT READY'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">Port 8080</div>
            <div className="text-xs text-muted-foreground font-mono">{api.baseUrl}</div>
            <a
              href={`${api.baseUrl}/metrics`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <Activity className="h-3 w-3" />
              Prometheus /metrics
            </a>
          </CardContent>
        </Card>

        {/* Database Layer */}
        <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="h-4 w-4 text-primary" />
                Database Layer
              </CardTitle>
              <Badge
                variant="outline"
                className={
                  dbInfo?.status === 'up'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]'
                }
              >
                {dbInfo?.mode === 'sqlite' ? 'SQLite' : dbInfo?.mode || 'Offline'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {dbInfo?.mode === 'postgres-gorm' ? 'PostgreSQL' : dbInfo?.mode === 'sqlite' ? 'SQLite' : 'Database'}
            </div>
            <div className="text-xs text-muted-foreground">
              {dbInfo?.mode === 'sqlite' ? 'Zero-Setup Local Persistent' : dbInfo?.mode === 'postgres-gorm' ? 'PostgreSQL Connection Pool' : 'Chưa kết nối'}
            </div>
          </CardContent>
        </Card>

        {/* AI MCP Server */}
        <Card className="border-border/60 shadow-xs hover:border-primary/40 transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Bot className="h-4 w-4 text-primary" />
                AI MCP Server
              </CardTitle>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {tools.length} Tools Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground">JSON-RPC 2.0</div>
            <div className="text-xs text-muted-foreground">Claude • Cursor • Antigravity Stdio</div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Navigation Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/40 border border-border/40">
          {has('mcp') && (
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'mcp'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="size-3.5" />
            <span>AI MCP Playground &amp; Tools</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-1">
              {tools.length}
            </Badge>
          </button>
          )}

          <button
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'gateway'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="size-3.5" />
            <span>Cổng REST API Root</span>
          </button>

          {has('mobile') && (
          <button
            onClick={() => setActiveTab('mobile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'mobile'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>Mobile Extension Tester</span>
          </button>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading} className="h-8 text-xs gap-1.5">
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* TAB 1: AI MCP PLAYGROUND & TOOLS */}
      {tab === 'mcp' && (
        <div className="space-y-6">
          {/* Header Banner & Terminal Helper */}
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Interactive MCP Playground</h4>
                <p className="text-xs text-muted-foreground">
                  Trực tiếp kiểm thử các công cụ AI (MCP Tools) của backend qua giao thức chuẩn JSON-RPC 2.0.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-background/80 border border-border px-3 py-1.5 rounded-lg">
              <Terminal className="size-3.5 text-muted-foreground" />
              <code className="text-xs font-mono text-primary font-bold">go run ./cmd mcp</code>
              <Button variant="ghost" size="icon" className="size-6 ml-1" onClick={handleCopyCmd} title="Sao chép lệnh">
                {copiedCmd ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          {/* Master-Detail Layout: Left Tools List, Right Interactive Execution Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Available Tools Column */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Danh Sách Tools ({tools.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Chọn tool để test</span>
              </div>

              <div className="space-y-2">
                {tools.map((t) => {
                  const isSelected = selectedTool?.name === t.name
                  let tag = 'CORE'
                  if (t.name.includes('user') || t.name.includes('profile') || t.name.includes('register')) tag = 'AUTH'
                  else if (t.name.includes('file') || t.name.includes('upload')) tag = 'MEDIA'
                  else if (t.name.includes('permission') || t.name.includes('role')) tag = 'RBAC'

                  return (
                    <div
                      key={t.name}
                      onClick={() => handleSelectTool(t)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1 ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20'
                          : 'border-border/60 bg-card hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Code2 className={`size-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`font-mono font-bold text-xs truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {t.name}
                          </span>
                        </div>
                        <Badge
                          variant={isSelected ? 'default' : 'secondary'}
                          className="text-[10px] uppercase font-mono font-bold shrink-0 py-0 px-1.5"
                        >
                          {tag}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 pl-6">
                        {t.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Interactive Playground Detail */}
            <div className="lg:col-span-7">
              {selectedTool ? (
                <Card className="border-border/60 shadow-sm">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold font-mono text-primary">
                            {selectedTool.name}
                          </CardTitle>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            JSON-RPC 2.0
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {selectedTool.description}
                        </CardDescription>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleExecuteTool}
                        disabled={executing}
                        className="gap-1.5 font-semibold text-xs shadow-xs"
                      >
                        <Play className={`size-3.5 fill-current ${executing ? 'animate-pulse' : ''}`} />
                        <span>{executing ? 'Đang gọi...' : 'Chạy Tool'}</span>
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    {/* JSON Schema Details Accordion / Preview */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                        <span>Tham Số Đầu Vào (JSON Arguments)</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          Yêu cầu: {(selectedTool.inputSchema?.required || []).join(', ') || 'Không'}
                        </span>
                      </Label>
                      <textarea
                        value={argsJson}
                        onChange={(e) => setArgsJson(e.target.value)}
                        rows={6}
                        className="w-full font-mono text-xs p-3 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground leading-relaxed"
                        placeholder="Nhập JSON arguments..."
                      />
                    </div>

                    {/* Execution Latency & Status */}
                    {execLatency !== null && (
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Activity className="size-3.5 text-primary" />
                          Thời gian phản hồi:
                        </span>
                        <Badge variant="outline" className="font-mono text-[11px] text-emerald-500 border-emerald-500/30">
                          {execLatency} ms
                        </Badge>
                      </div>
                    )}

                    {/* Result or Error Display */}
                    {execError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertCircle className="size-4" />
                          <span>Lỗi thực thi Tool:</span>
                        </div>
                        <p className="font-mono text-[11px] break-all">{execError}</p>
                      </div>
                    )}

                    {execResult !== null && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                            <span>Kết Quả Phản Hồi (Execution Result)</span>
                          </Label>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border/50 max-h-80">
                          <pre>{JSON.stringify(execResult, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="p-12 rounded-xl border border-dashed border-border text-center text-muted-foreground text-xs">
                  Vui lòng chọn một MCP Tool ở cột bên trái để bắt đầu chạy thử.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REST API ROOT & SWAGGER */}
      {tab === 'gateway' && (
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Gateway Root &amp; Swagger Integration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Thông tin meta tổng quan từ endpoint gốc GET / của Go Gateway
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" asChild className="h-8 text-xs font-semibold">
                    <a href={`${api.baseUrl}/swagger/index.html`} target="_blank" rel="noreferrer">
                      <span>Mở Swagger UI</span>
                      <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border/50">
                <div className="flex items-center gap-1.5 text-blue-400 font-sans text-xs font-semibold mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Phản hồi từ GET /:</span>
                </div>
                <pre>{JSON.stringify(gatewayData, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: MOBILE EXTENSION TESTER */}
      {tab === 'mobile' && (
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Mobile Extension Tester (/api/mobile/v1)
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  module mobile
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Kiểm thử API kiểm tra phiên bản ứng dụng di động &amp; Force Update từ Mobile Plugin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckMobileVersion} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Nền tảng</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={mobilePlatform === 'android' ? 'default' : 'outline'}
                        className="flex-1 text-xs"
                        onClick={() => setMobilePlatform('android')}
                      >
                        Android
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mobilePlatform === 'ios' ? 'default' : 'outline'}
                        className="flex-1 text-xs"
                        onClick={() => setMobilePlatform('ios')}
                      >
                        iOS
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Phiên bản hiện tại</Label>
                    <Input
                      className="text-xs h-9"
                      value={mobileVersion}
                      onChange={(e) => setMobileVersion(e.target.value)}
                      placeholder="1.0.0"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={checkingMobile} size="sm" className="w-full text-xs font-semibold">
                  {checkingMobile ? 'Đang kiểm tra...' : 'Kiểm tra phiên bản Mobile'}
                </Button>
              </form>

              {mobileResult && (
                <div className="mt-4 p-3 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto border border-border/50">
                  <div className="text-blue-400 font-sans font-semibold mb-1">Kết quả trả về:</div>
                  <pre>{JSON.stringify(mobileResult, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  )
}
