import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Bell, CalendarDays, Moon, ShieldAlert, Sun, Users, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Logo } from "@/components/Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/security", label: "Security", icon: ShieldAlert },
];

const PAGE_TITLES = {
  "/admin": "Dashboard",
  "/admin/members": "Members",
  "/admin/events": "Events",
  "/admin/notifications": "Notifications",
  "/admin/security": "Security & Ownership",
};

function SidebarNav({ collapsed = false, onNavigate }) {
  return (
    <nav className={cn("flex flex-col gap-1", collapsed ? "px-2" : "px-3")}>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            cn(
              "flex items-center rounded-md text-sm font-medium transition-colors",
              collapsed ? "h-9 justify-center" : "gap-2.5 px-3 py-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Icon className="size-4 shrink-0" />
          {!collapsed && label}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminBadge({ admin }) {
  if (!admin) return null;
  return (
    <div className="flex items-center gap-2.5 px-1">
      <Avatar className="size-8">
        <AvatarFallback>{initials(admin.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight">{admin.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
      </div>
    </div>
  );
}

function SidebarBody({ admin, collapsed, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center border-b", collapsed ? "justify-center px-2" : "px-4")}>
        {collapsed ? <Logo markOnly /> : <Logo />}
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        {!collapsed && (
          <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Console
          </p>
        )}
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>
      <div className="border-t p-3">
        <AdminBadge admin={collapsed ? null : admin} />
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const { admin, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/admin/members/")
      ? "Member Details"
      : location.pathname.startsWith("/admin/events/")
        ? "Event Details"
        : "XDEV Club");

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-[width] duration-200 ease-in-out md:block",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarBody admin={admin} collapsed={collapsed} />
      </aside>

      {/* Main column */}
      <div className={cn("flex min-h-svh flex-col transition-[padding] duration-200", collapsed ? "md:pl-16" : "md:pl-60")}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu />
            <span className="sr-only">Open menu</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <h1 className="text-sm font-semibold">{title}</h1>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback>{initials(admin?.full_name ?? "?")}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate font-medium sm:inline">
                    {admin?.full_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium text-foreground">{admin?.full_name}</p>
                  <p className="truncate font-normal">{admin?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <Sun /> : <Moon />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main key={location.pathname} className="animate-page-in flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody admin={admin} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
