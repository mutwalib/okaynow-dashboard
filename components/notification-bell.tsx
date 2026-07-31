"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Radio } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { notificationHref } from "@/lib/notification-href";
import { useRealtime } from "@/lib/realtime-context";
import { Button } from "@/components/ui/button";

export function NotificationBell({
  tone = "admin",
}: {
  tone?: "marketplace" | "admin";
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { connected, unreadCount, notifications, markRead, markAllRead, refresh } =
    useRealtime();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    refresh();
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, refresh]);

  const buttonClass =
    "relative text-ink-muted hover:text-ink hover:bg-panel-2";
  const panelClass =
    "absolute right-0 z-[200] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded border border-line bg-panel shadow-lg";

  async function openNotification(
    id: string,
    readAt: string | null,
    href: string | null,
  ) {
    if (!readAt) await markRead(id);
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={buttonClass}
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <Radio
                  className={`h-3 w-3 ${connected ? "text-success" : "text-warn"}`}
                  aria-hidden
                />
                {connected ? "Live" : "Reconnecting"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={unreadCount === 0}
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Mark all
            </Button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-ink-muted">
                No notifications yet.
              </li>
            ) : (
              notifications.map((n) => {
                const href = notificationHref(n, user?.role ?? "ADMIN");
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full border-b border-line px-3 py-2.5 text-left transition hover:bg-panel-2 ${
                        n.readAt ? "opacity-70" : "bg-accent/5"
                      } ${href ? "cursor-pointer" : ""}`}
                      onClick={() => void openNotification(n.id, n.readAt, href)}
                    >
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>
                      <p className="mt-1 font-mono text-[10px] text-ink-muted">
                        {new Date(n.createdAt).toLocaleString()}
                        {href ? " · Open" : ""}
                      </p>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
