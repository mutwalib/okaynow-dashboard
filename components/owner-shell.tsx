"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileBarChart2,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  UserCog,
} from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/finance", label: "Finance", icon: CircleDollarSign },
  { href: "/clients", label: "Clients", icon: HeartHandshake },
  { href: "/shifts", label: "Shifts", icon: CalendarClock },
  { href: "/claims", label: "Claims", icon: Handshake },
  { href: "/reviews", label: "Reviews", icon: MessageSquareQuote },
  { href: "/users", label: "Users", icon: UserCog },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/audit", label: "Audit log", icon: ScrollText },
];

const SIDEBAR_COLLAPSED_KEY = "okaynow-admin-sidebar-collapsed";

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const marketplaceUrl =
    process.env.NEXT_PUBLIC_MARKETPLACE_APP_URL || "http://localhost:3000";
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const pageTitle =
    NAV.find((item) => isActive(item.href))?.label ?? "Owner console";

  const sidebarWidth = !ready || !collapsed ? "md:w-56" : "md:w-16";
  const contentOffset = !ready || !collapsed ? "md:pl-56" : "md:pl-16";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-sidebar text-sidebar-fg transition-[width] duration-200 md:flex ${sidebarWidth}`}
      >
        <div
          className={`border-b border-white/10 ${
            collapsed
              ? "flex flex-col items-center gap-1 px-1.5 py-2.5"
              : "flex items-center justify-between gap-2 px-3 py-3"
          }`}
        >
          {collapsed ? (
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded font-display text-sm font-semibold text-white"
              title="OkayNow Owner console"
            >
              ON
            </Link>
          ) : (
            <Link href="/" className="min-w-0 flex-1">
              <div className="font-display text-lg font-semibold tracking-tight text-white">
                OkayNow
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">
                Owner console
              </div>
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`shrink-0 text-sidebar-muted hover:bg-white/8 hover:text-white ${
              collapsed ? "h-8 w-8 px-0" : ""
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`inline-flex items-center rounded py-2 text-sm font-medium transition ${
                  collapsed ? "justify-center px-2" : "gap-2.5 px-3"
                } ${
                  isActive(item.href)
                    ? "bg-white/12 text-white"
                    : "text-sidebar-muted hover:bg-white/6 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-white/10 ${collapsed ? "p-2" : "p-3"}`}>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`text-sidebar-muted hover:bg-white/8 hover:text-white ${
                collapsed ? "justify-center px-2" : "justify-start"
              }`}
              title={collapsed ? "Sign out" : undefined}
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              {!collapsed ? "Sign out" : null}
            </Button>
            {!collapsed ? (
              <a
                href={marketplaceUrl}
                className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-sidebar-muted hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Marketplace app
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : (
              <a
                href={marketplaceUrl}
                className="inline-flex items-center justify-center rounded px-2 py-1.5 text-sidebar-muted hover:bg-white/8 hover:text-white"
                target="_blank"
                rel="noreferrer"
                title="Marketplace app"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </aside>

      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ${contentOffset}`}
      >
        <header className="sticky top-0 z-[80] flex items-center justify-between gap-3 border-b border-line bg-panel/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-panel/80 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:hidden">
              <Link href="/" className="font-display text-base font-semibold">
                OkayNow
              </Link>
              <span className="text-ink-muted" aria-hidden>
                /
              </span>
              <p className="truncate font-display text-base font-semibold text-ink">
                {pageTitle}
              </p>
            </div>
            <div className="hidden min-w-0 md:block">
              <h1 className="truncate font-display text-lg font-semibold text-ink">
                {pageTitle}
              </h1>
              <p className="truncate text-xs text-ink-muted">
                {user?.email ?? "Owner console"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell tone="admin" />
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </Button>
          </div>
        </header>
        <nav className="sticky top-[3.25rem] z-[70] flex gap-1 overflow-x-auto border-b border-line bg-panel px-2 py-1.5 md:hidden">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium ${
                  isActive(item.href)
                    ? "bg-accent/10 text-accent-deep"
                    : "text-ink-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
