import * as React from "react"
import { Link, useLocation } from "react-router"
import { useTranslation } from "react-i18next"
import {
  ShieldCheck,
  FolderArchive,
  Server,
  User as UserIcon,
  LogOut,
  Layers,
  LayoutDashboard,
  Users,
  Bell,
  ScrollText,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/lib/permissions"
import { useModules, type ModuleName } from "@/lib/modules"
import type { User } from "@/types"

interface NavItem {
  to: string
  labelKey: string
  icon: React.ComponentType<{ className?: string }>
  /** Bỏ trống = chỉ cần đăng nhập. */
  permission?: string
  /** Module backend tuỳ chọn; mục bị ẩn khi module tắt. */
  module?: ModuleName
}

interface NavGroup {
  labelKey: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "nav.core",
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { to: "/rbac", labelKey: "nav.rbac", icon: ShieldCheck, permission: "roles:view" },
      { to: "/users", labelKey: "nav.users", icon: Users, permission: "users:view" },
      { to: "/media", labelKey: "nav.media", icon: FolderArchive, permission: "media:view", module: "media" },
    ],
  },
  {
    labelKey: "nav.platform",
    items: [
      { to: "/gateway", labelKey: "nav.gateway", icon: Server },
      { to: "/notifications", labelKey: "nav.notifications", icon: Bell, module: "notifications" },
      { to: "/audit", labelKey: "nav.audit", icon: ScrollText, permission: "audit:view", module: "audit" },
    ],
  },
]

const itemClass =
  "font-medium text-xs rounded-xl transition-all group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-xs shadow-primary/20"

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentUser: User | null
  onLogout: () => void
  sidebarWidth?: string
}

export function AppSidebar({
  currentUser,
  onLogout,
  sidebarWidth,
  collapsible = "icon",
  variant = "sidebar",
  ...props
}: AppSidebarProps) {
  const { t } = useTranslation()
  const { state, toggleSidebar } = useSidebar()
  const { can } = usePermissions()
  const { has } = useModules()
  const location = useLocation()
  const isCollapsed = state === "collapsed"

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to)

  const visibleGroups = React.useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            (!item.module || has(item.module)) && (!item.permission || can(item.permission)),
        ),
      })).filter((group) => group.items.length > 0),
    [can, has],
  )

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className={variant === "sidebar" ? "border-r border-border/60 bg-sidebar" : "bg-sidebar"}
      style={
        {
          "--sidebar-width": sidebarWidth,
        } as React.CSSProperties
      }
      {...props}
    >
      {/* Brand Header */}
      <SidebarHeader className="border-b border-border/40 p-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={isCollapsed ? toggleSidebar : undefined}
                className={`flex aspect-square size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 ${
                  isCollapsed ? "cursor-pointer hover:scale-105 transition-transform" : ""
                }`}
              >
                <Layers className="size-4.5" />
              </div>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" align="center">
                {t("nav.expandSidebar")}
              </TooltipContent>
            )}
          </Tooltip>

          <div className="flex flex-col gap-0.5 min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-foreground text-sm truncate">
              <span>{t("common.appName")}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono text-primary border-primary/30 shrink-0">
                Shield
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">{t("common.appTagline")}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2.5 space-y-3 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:space-y-2">
        {visibleGroups.map((group) => (
          <SidebarGroup
            key={group.labelKey}
            className="px-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:items-center"
          >
            <SidebarGroupLabel className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase px-2 group-data-[collapsible=icon]:hidden">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.to} className="flex justify-center w-full">
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.to)}
                        tooltip={t(item.labelKey)}
                        className={itemClass}
                      >
                        <Link to={item.to}>
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            {t(item.labelKey)}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      {/* User Footer with Theme Toggle & Logout */}
      <SidebarFooter className="p-2 border-t border-border/40 space-y-2 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:space-y-1.5">
        {currentUser ? (
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-card border border-border/50 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:bg-primary/20 transition-colors shadow-2xs">
                  <UserIcon className="size-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                <div className="text-xs font-semibold">{currentUser.full_name || currentUser.name || t("common.account")}</div>
                <div className="text-[10px] text-muted-foreground font-mono">{currentUser.email}</div>
              </TooltipContent>
            </Tooltip>

            <div className="min-w-0 group-data-[collapsible=icon]:hidden ml-2 flex-1">
              <div className="truncate font-semibold text-xs text-foreground">
                {currentUser.full_name || currentUser.name || t("common.administrator")}
              </div>
              <div className="truncate text-[10px] text-muted-foreground font-mono">
                {currentUser.email}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive shrink-0 group-data-[collapsible=icon]:hidden"
              onClick={onLogout}
              title={t("common.logout")}
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="p-2 text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {t("common.notLoggedIn")}
          </div>
        )}

        {/* Logout Button in Collapsed Mode */}
        {currentUser && (
          <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="size-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {t("common.logout")}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarFooter>

      {collapsible !== "none" && <SidebarRail />}
    </Sidebar>
  )
}
