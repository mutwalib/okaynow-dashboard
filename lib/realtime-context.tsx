"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { createRealtimeClient } from "@/lib/realtime";
import { useToast } from "@/lib/toast-context";
import type { AppNotification } from "@/lib/types";

interface RealtimeContextValue {
  connected: boolean;
  unreadCount: number;
  notifications: AppNotification[];
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<ReturnType<typeof createRealtimeClient> | null>(
    null,
  );

  const unreadQ = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: getUnreadNotificationCount,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const listQ = useQuery({
    queryKey: ["notifications-me"],
    queryFn: () => getMyNotifications(0, 40),
    enabled: isAuthenticated,
  });

  const invalidateBoards = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["shifts"] });
    void queryClient.invalidateQueries({ queryKey: ["shifts-open-preview"] });
    void queryClient.invalidateQueries({ queryKey: ["owner-shifts"] });
    void queryClient.invalidateQueries({ queryKey: ["my-claims"] });
    void queryClient.invalidateQueries({ queryKey: ["owner-claims"] });
    void queryClient.invalidateQueries({ queryKey: ["shift"] });
    void queryClient.invalidateQueries({ queryKey: ["dash-open"] });
    void queryClient.invalidateQueries({ queryKey: ["dash-claimed"] });
    void queryClient.invalidateQueries({ queryKey: ["dash-confirmed"] });
    void queryClient.invalidateQueries({ queryKey: ["dash-completed"] });
    void queryClient.invalidateQueries({ queryKey: ["dash-claims"] });
    void queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["finance-settlements"] });
    void queryClient.invalidateQueries({ queryKey: ["visit"] });
    void queryClient.invalidateQueries({ queryKey: ["schedule-calendar"] });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated) {
      clientRef.current?.deactivate();
      clientRef.current = null;
      setConnected(false);
      return;
    }

    const client = createRealtimeClient({
      onConnected: () => setConnected(true),
      onDisconnected: () => setConnected(false),
      onShiftBoard: () => {
        invalidateBoards();
      },
      onNotification: (n) => {
        showToast(n.title, "info");
        void queryClient.invalidateQueries({ queryKey: ["notifications-me"] });
        void queryClient.invalidateQueries({
          queryKey: ["notifications-unread"],
        });
        invalidateBoards();
      },
    });
    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      if (clientRef.current === client) clientRef.current = null;
    };
  }, [isAuthenticated, invalidateBoards, queryClient, showToast]);

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      void queryClient.invalidateQueries({ queryKey: ["notifications-me"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
    [queryClient],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    void queryClient.invalidateQueries({ queryKey: ["notifications-me"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  }, [queryClient]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connected,
      unreadCount: unreadQ.data?.count ?? 0,
      notifications: listQ.data?.content ?? [],
      refresh: () => {
        void listQ.refetch();
        void unreadQ.refetch();
      },
      markRead,
      markAllRead,
    }),
    [
      connected,
      unreadQ.data?.count,
      listQ.data?.content,
      listQ,
      unreadQ,
      markRead,
      markAllRead,
    ],
  );

  return (
    <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}
